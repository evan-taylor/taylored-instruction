const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.script') }); // Load .env.script

// --- Configuration ---
const CSV_FILE_PATH = path.resolve(__dirname, '../products copy.csv');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BATCH_SIZE = 50; // Insert products in batches

// --- Helper Functions ---

// Basic validation and environment check
function validateConfig() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        throw new Error(`CSV file not found at: ${CSV_FILE_PATH}`);
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Supabase URL or Service Key missing in .env.script file.');
    }
    console.log("Configuration validated.");
}

// Format strings into PostgreSQL array literal (e.g., {"item1","item2"})
function formatArrayLiteral(inputString, separator = ', ') {
    if (!inputString || typeof inputString !== 'string') {
        return null; // Return null for empty or non-string inputs
    }
    const items = inputString.split(separator)
        .map(item => item.trim())
        .filter(item => item) // Remove empty strings after trim
        .map(item => `"${item.replace(/"/g, '""')}"`); // Escape double quotes

    if (items.length === 0) {
        return null; // Return null if no valid items found
    }
    return `{${items.join(',')}}`;
}

// Determine product type based on CSV data
function determineProductType(csvRow) {
    const name = csvRow['Name']?.toLowerCase() || '';
    const categories = csvRow['Categories']?.toLowerCase() || '';

    if (name.includes('ecard') || categories.includes('ecards')) {
        return 'ecard';
    }
    if (name.includes('aed') || categories.includes('aeds')) {
        return 'aed';
    }
    // Add more specific checks if needed based on your data
    // e.g., check SKU or other fields
    return 'digital'; // Default type
}

// Determine if instructor role is required
function requiresInstructor(csvRow) {
    const restriction = csvRow['Meta: wppb-purchase-restrict-user-role'] || '';
    return restriction.trim() === 'taylored_instruction_instructor';
}

// Map CSV row to Supabase product object
function mapCsvRowToProduct(csvRow) {
    const price = parseFloat(csvRow['Regular price']);
    if (isNaN(price)) {
        console.warn(`Skipping row with invalid price: ID=${csvRow['ID']}, Name=${csvRow['Name']}, Price='${csvRow['Regular price']}'`);
        return null; // Skip rows with invalid prices
    }

    const productType = determineProductType(csvRow);
    const needsInstructor = requiresInstructor(csvRow);

    // Special handling for eCards - they require instructor regardless of the meta field (double-check logic)
    // And also check if the Meta field explicitly requires it
    const finalRequiresInstructor = productType === 'ecard' || needsInstructor;


    return {
        original_csv_id: parseInt(csvRow['ID'], 10) || null,
        sku: csvRow['SKU'] || null,
        name: csvRow['Name'],
        description: csvRow['Description'] || null,
        price: price,
        image_urls: formatArrayLiteral(csvRow['Images']),
        categories: formatArrayLiteral(csvRow['Categories']),
        type: productType,
        requires_instructor: finalRequiresInstructor,
        // Add other fields from your Supabase table if needed
    };
}


// --- Main Execution ---
async function main() {
    console.log("Starting product migration script...");
    validateConfig();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Supabase client initialized.");

    const csvFileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    console.log("CSV file read.");

    Papa.parse(csvFileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            console.log(`Parsed ${results.data.length} rows from CSV.`);
            const productsToInsert = results.data
                .map(mapCsvRowToProduct)
                .filter(product => product !== null && product.name); // Filter out skipped rows and rows without names

            console.log(`Attempting to insert ${productsToInsert.length} valid products.`);

            if (productsToInsert.length === 0) {
                console.log("No valid products found to insert. Exiting.");
                return;
            }

            try {
                // Clear existing products before inserting (optional, use with caution)
                console.log("Clearing existing products...");
                const { error: deleteError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
                if (deleteError) {
                    console.error("Error clearing existing products:", deleteError);
                    return; // Stop if clearing fails
                }
                console.log("Existing products cleared.");


                console.log(`Inserting products in batches of ${BATCH_SIZE}...`);
                for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
                    const batch = productsToInsert.slice(i, i + BATCH_SIZE);
                    console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
                    const { data, error } = await supabase
                        .from('products')
                        .insert(batch)
                        .select(); // Select to get feedback

                    if (error) {
                        console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
                        // Optionally decide whether to continue with next batch or stop
                        // break; // Uncomment to stop on first error
                    } else {
                        console.log(`Successfully inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${data?.length || 0} rows).`);
                    }
                }
                console.log("Product migration finished.");
            } catch (error) {
                console.error("An unexpected error occurred during insertion:", error);
            }
        },
        error: (error) => {
            console.error("Error parsing CSV:", error);
        }
    });
}

main().catch(error => {
    console.error("Script failed:", error);
    process.exit(1);
}); 