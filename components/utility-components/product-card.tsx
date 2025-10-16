import React, { useContext, useMemo } from "react";
import { Chip } from "@nextui-org/react";
import Link from "next/link";
import { locationAvatar } from "./dropdowns/location-dropdown";
import ImageCarousel from "./image-carousel";
import CompactPriceDisplay from "./display-monetary-info";
import { ProductData } from "@/utils/parsers/product-parser-functions";
import { ProfileWithDropdown } from "./profile/profile-dropdown";
import { useRouter } from "next/router";
import { SignerContext } from "@/components/utility-components/nostr-context-provider";
import { formatDurationCompact } from "@/utils/time/countdown";

export default function ProductCard({
  productData,
  onProductClick,
  href,
}: {
  productData: ProductData | null;
  onProductClick?: (productId: ProductData, e?: React.MouseEvent) => void;
  href?: string | null;
}) {
  const router = useRouter();
  const { pubkey: userPubkey } = useContext(SignerContext);

  const countdownLabel = useMemo(() => {
    if (!productData) {
      return "";
    }

    return formatDurationCompact(productData.secondsUntilExpiration);
  }, [productData?.secondsUntilExpiration]);

  if (!productData) return null;

  const showCountdown = Boolean(countdownLabel) && !productData.isExpired;
  const isEndingSoon =
    typeof productData.secondsUntilExpiration === "number" &&
    productData.secondsUntilExpiration <= 86_400;

  const statusBadgeClass =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur";

  const renderStatusBadge = () => {
    if (productData.isExpired) {
      return (
        <span
          className={`${statusBadgeClass} bg-gray-900/80 text-gray-100 dark:bg-gray-100/90 dark:text-gray-900`}
        >
          Expired
        </span>
      );
    }

    if (productData.status === "sold") {
      return (
        <span className={`${statusBadgeClass} bg-red-500/90 text-white`}>
          Sold
        </span>
      );
    }

    if (productData.status === "active") {
      return (
        <span className={`${statusBadgeClass} bg-emerald-500/90 text-white`}>
          Active
        </span>
      );
    }

    return null;
  };

  const cardHoverStyle =
    "hover:shadow-purple-500/30 dark:hover:shadow-yellow-500/30 hover:scale-[1.01]";

  const content = (
    <div
      className="cursor-pointer"
      onClick={(e) => {
        onProductClick && onProductClick(productData, e);
      }}
    >
      <div className="relative">
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {renderStatusBadge()}
          {showCountdown && (
            <span
              className={`${statusBadgeClass} ${
                isEndingSoon
                  ? "bg-red-600/90 text-white"
                  : "bg-black/70 text-white dark:bg-white/20"
              }`}
            >
              Expires in {countdownLabel}
            </span>
          )}
        </div>
        <ImageCarousel
          images={productData.images}
          classname="w-full h-[300px] rounded-t-2xl"
          showThumbs={false}
        />
      </div>
      <div className="flex flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="max-w-[70%] truncate text-xl font-semibold text-light-text dark:text-dark-text">
            {productData.title}
          </h2>
          {!productData.isExpired &&
            router.pathname !== "/" &&
            showCountdown && (
              <span
                className={`rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/50 dark:text-purple-200`}
              >
                {isEndingSoon ? "Expiring Soon" : "Fresh Listing"}
              </span>
            )}
        </div>
        <div className="mb-3">
          <ProfileWithDropdown
            pubkey={productData.pubkey}
            dropDownKeys={
              productData.pubkey === userPubkey
                ? ["shop_profile"]
                : ["shop", "inquiry", "copy_npub"]
            }
          />
        </div>
        {router.pathname !== "/" && (
          <div className="mt-1 flex items-center justify-between">
            <Chip
              key={productData.location}
              startContent={locationAvatar(productData.location)}
              className="text-xs"
            >
              {productData.location}
            </Chip>
            <CompactPriceDisplay monetaryInfo={productData} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`${cardHoverStyle} mx-2 my-4 rounded-2xl bg-white shadow-md duration-300 transition-all dark:bg-neutral-900`}
    >
      <div className="w-80 overflow-hidden rounded-2xl">
        {href ? (
          <Link href={href} className="block">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
