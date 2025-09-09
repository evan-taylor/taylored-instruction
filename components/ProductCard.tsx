import Image from "next/image";
import Link from "next/link";
import type React from "react";
import type { Product } from "../types";

// Helper to get the first image URL or a placeholder
const getImageUrl = (imageUrls: string[] | null | undefined): string => {
  if (
    imageUrls &&
    imageUrls.length > 0 &&
    imageUrls[0] &&
    imageUrls[0].startsWith("http")
  ) {
    return imageUrls[0];
  }
  return "/placeholder-image.png"; // Provide a path to a placeholder image in your public folder
};

type ProductCardProps = {
  product: Product | null | undefined;
  isInstructor: boolean;
};

const ProductCard: React.FC<ProductCardProps> = ({ product, isInstructor }) => {
  if (!product) {
    return null;
  }

  const imageUrl = getImageUrl(product.image_urls);
  const productUrl = `/product/${product.id}`; // Link to a future product detail page

  // Determine if the button should be disabled
  const isDisabled = product.requires_instructor && !isInstructor;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-white shadow-md transition-shadow duration-200 hover:shadow-lg">
      <Link
        className="block aspect-h-1 aspect-w-1 w-full cursor-pointer overflow-hidden bg-gray-100"
        href={productUrl}
      >
        <Image
          alt={product.name || "Product image"}
          className="h-full w-full object-cover group-hover:opacity-75"
          height={300}
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder-image.png";
          }}
          src={imageUrl}
          width={300}
        />
      </Link>
      <div className="flex flex-grow flex-col p-4">
        <h3 className="mb-1 font-semibold text-gray-800 text-md">
          <Link className="cursor-pointer hover:underline" href={productUrl}>
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <p className="font-bold text-gray-900 text-lg">
            ${product.price ? Number(product.price).toFixed(2) : "N/A"}
          </p>
          <button
            className={`ml-2 rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors duration-150 hover:bg-blue-600 ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={isDisabled}
            onClick={() =>
              alert(`Adding ${product.name} to cart (not implemented)`)
            }
            title={isDisabled ? "Requires instructor login" : "Add to cart"}
          >
            Add to Cart
          </button>
        </div>
        {isDisabled && (
          <p className="mt-1 text-red-600 text-xs">
            Instructor login required.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
