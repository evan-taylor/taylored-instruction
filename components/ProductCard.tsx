import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import type { Product } from '../types';

// Helper to get the first image URL or a placeholder
const getImageUrl = (imageUrls: string[] | null | undefined): string => {
    if (imageUrls && imageUrls.length > 0 && imageUrls[0] && imageUrls[0].startsWith('http')) {
        return imageUrls[0];
    }
    return '/placeholder-image.png'; // Provide a path to a placeholder image in your public folder
};

interface ProductCardProps {
    product: Product | null | undefined;
    isInstructor: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isInstructor }) => {
    if (!product) return null;

    const imageUrl = getImageUrl(product.image_urls);
    const productUrl = `/product/${product.id}`; // Link to a future product detail page

    // Determine if the button should be disabled
    const isDisabled = product.requires_instructor && !isInstructor;

    return (
        <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-white flex flex-col">
            <Link href={productUrl} className="block aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-100 cursor-pointer">
                <Image
                    src={imageUrl}
                    alt={product.name || 'Product image'}
                    width={300}
                    height={300}
                    className="object-cover w-full h-full group-hover:opacity-75"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-image.png';
                     }}
                />
            </Link>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-md font-semibold text-gray-800 mb-1">
                    <Link href={productUrl} className="hover:underline cursor-pointer">
                        {product.name}
                    </Link>
                </h3>
                <div className="mt-auto flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-900">${product.price ? Number(product.price).toFixed(2) : 'N/A'}</p>
                    <button
                        className={`ml-2 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors duration-150 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => alert(`Adding ${product.name} to cart (not implemented)`)}
                        disabled={isDisabled}
                        title={isDisabled ? "Requires instructor login" : "Add to cart"}
                    >
                        Add to Cart
                    </button>
                </div>
                {isDisabled && (
                     <p className="text-xs text-red-600 mt-1">Instructor login required.</p>
                 )}
            </div>
        </div>
    );
};

export default ProductCard; 