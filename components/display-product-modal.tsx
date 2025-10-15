import React, { useContext, useMemo, useState } from "react";
import {
  PencilSquareIcon,
  ShareIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Divider,
} from "@nextui-org/react";
import ProductForm from "./product-form";
import ImageCarousel from "./utility-components/image-carousel";
import CompactCategories from "./utility-components/compact-categories";
import { locationAvatar } from "./utility-components/dropdowns/location-dropdown";
import { SHOPSTRBUTTONCLASSNAMES } from "@/utils/STATIC-VARIABLES";
import ConfirmActionDropdown from "./utility-components/dropdowns/confirm-action-dropdown";
import { ProfileWithDropdown } from "./utility-components/profile/profile-dropdown";
import SuccessModal from "./utility-components/success-modal";
import {
  NostrContext,
  SignerContext,
} from "@/components/utility-components/nostr-context-provider";
import { nip19 } from "nostr-tools";
import { ProductData } from "@/utils/parsers/product-parser-functions";
import { ProductContext } from "@/utils/context/context";
import { addProductToCache } from "@/utils/nostr/cache-service";
import { renewListing } from "@/utils/nostr/nostr-helper-functions";
import { formatDurationCompact, formatDurationLong } from "@/utils/time/countdown";

interface ProductModalProps {
  productData: ProductData;
  handleModalToggle: () => void;
  showModal: boolean;
  handleDelete: (productId: string) => void;
}

export default function DisplayProductModal({
  productData,
  showModal,
  handleModalToggle,
  handleDelete,
}: ProductModalProps) {
  const { pubkey: userPubkey, isLoggedIn, signer } = useContext(SignerContext);
  const { nostr } = useContext(NostrContext);
  const productEventContext = useContext(ProductContext);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState(
    "Listing URL copied to clipboard!"
  );
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  const displayDate = (timestamp: number): [string, string] => {
    if (timestamp == 0 || !timestamp) return ["", ""];
    const d = new Date(timestamp * 1000);
    const dateString = d.toLocaleString().split(",")[0]!.trim();
    const timeString = d.toLocaleString().split(",")[1]!.trim();
    return [dateString, timeString];
  };

  const publishedDate = displayDate(productData.createdAt);
  const expirationDate = productData.expiration
    ? displayDate(productData.expiration)
    : null;
  const countdownLong = useMemo(
    () => formatDurationLong(productData.secondsUntilExpiration),
    [productData.secondsUntilExpiration]
  );
  const countdownCompact = useMemo(
    () => formatDurationCompact(productData.secondsUntilExpiration),
    [productData.secondsUntilExpiration]
  );
  const showCountdown = Boolean(countdownLong) && !productData.isExpired;

  const handleRenewListing = async () => {
    if (!productData.rawEvent) {
      setRenewError(
        "Unable to renew because the original listing event is unavailable."
      );
      return;
    }

    if (!signer || !nostr || !isLoggedIn) {
      setRenewError("You must be signed in to renew this listing.");
      return;
    }

    try {
      setRenewLoading(true);
      setRenewError(null);
      const renewedEvent = await renewListing(
        productData.rawEvent,
        signer,
        isLoggedIn,
        nostr
      );
      productEventContext.addNewlyCreatedProductEvent(renewedEvent);
      await addProductToCache(renewedEvent);
      setSuccessModalMessage("Listing renewed successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Failed to renew listing", error);
      setRenewError("Something went wrong while renewing. Please try again.");
    } finally {
      setRenewLoading(false);
    }
  };

  const handleShare = async () => {
    const naddr = nip19.naddrEncode({
      identifier: productData.d as string,
      pubkey: productData.pubkey,
      kind: 30402,
    });
    // The content you want to share
    const shareData = {
      title: productData.title,
      url: `${window.location.origin}/listing/${naddr}`,
    };
    // Check if the Web Share API is available
    if (navigator.share) {
      // Use the share API
      await navigator.share(shareData);
    } else {
      // Fallback for browsers that do not support the Web Share API
      navigator.clipboard.writeText(
        `${window.location.origin}/listing/${naddr}`
      );
      setSuccessModalMessage("Listing URL copied to clipboard!");
      setShowSuccessModal(true);
    }
  };

  const handleEditToggle = () => {
    setShowProductForm(!showProductForm);
  };

  const beginDeleteListingProcess = () => {
    if (!isLoggedIn) return;
    finalizeDeleteListingProcess();
  };
  const finalizeDeleteListingProcess = () => {
    // only used for when signInMethod === "nsec"
    setDeleteLoading(true);
    handleModalToggle(); // closes product detail modal
    handleDelete(productData.id); // delete listing
    setDeleteLoading(false);
  };

  if (!showModal) return null; // needed to prevent TreeWalker error upon redirect while modal open

  return (
    <>
      <Modal
        backdrop="blur"
        isOpen={showModal}
        onClose={handleModalToggle}
        // className="bg-light-fg dark:bg-dark-fg text-black dark:text-white"
        classNames={{
          body: "py-6",
          backdrop: "bg-[#292f46]/50 backdrop-opacity-60",
          header: "border-b-[1px] border-[#292f46]",
          footer: "border-t-[1px] border-[#292f46]",
          closeButton: "hover:bg-black/5 active:bg-white/10",
        }}
        isDismissable={false}
        scrollBehavior={"outside"}
        size="2xl"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col text-light-text dark:text-dark-text">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
                {productData.title}
              </h2>
              <div>
                {productData.status === "active" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    Active
                  </span>
                )}
                {productData.status === "sold" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                    Sold
                  </span>
                )}
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="text-light-text dark:text-dark-text">
            {productData.images ? (
              <ImageCarousel
                images={productData.images}
                showThumbs={productData.images.length > 1}
                classname="max-h-[80vh]"
              />
            ) : null}
            <Divider />
              <div className="flex h-fit w-full flex-row flex-wrap items-center justify-between gap-2">
                <ProfileWithDropdown
                  pubkey={productData.pubkey}
                  dropDownKeys={
                    productData.pubkey === userPubkey
                      ? ["shop_profile"]
                      : ["shop", "inquiry", "copy_npub"]
                  }
                />
                <Chip
                  key={productData.location}
                  startContent={locationAvatar(productData.location)}
                >
                  {productData.location}
                </Chip>
                <CompactCategories categories={productData.categories} />
                {showCountdown && (
                  <div className="rounded-lg bg-purple-100 px-3 py-2 text-sm font-semibold text-purple-700 shadow-sm dark:bg-purple-900/40 dark:text-purple-200">
                    Listing expires in {countdownLong}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold">Published</p>
                  <p className="text-sm">{publishedDate[0]}</p>
                  <p className="text-sm">{publishedDate[1]}</p>
                </div>
                {expirationDate && (
                  <div className="text-right">
                    <p className="text-sm font-semibold">Expires</p>
                    <p
                      className={`text-sm ${
                        productData.isExpired
                          ? "text-red-500 dark:text-red-300"
                          : ""
                      }`}
                    >
                      {expirationDate[0]}
                    </p>
                    <p
                      className={`text-sm ${
                        productData.isExpired
                          ? "text-red-500 dark:text-red-300"
                          : ""
                      }`}
                    >
                      {expirationDate[1]}
                    </p>
                    {!productData.isExpired && countdownCompact && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
                        {countdownCompact} remaining
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Divider />
              <span className="text-xl font-semibold">Summary: </span>
              <span className="whitespace-break-spaces break-all">
                {productData.summary}
              </span>
              {productData.isExpired && expirationDate && (
                <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                  This listing expired on {expirationDate[0]} at {" "}
                  {expirationDate[1]}. Renew it to make it visible in the
                  marketplace again.
                </div>
              )}
              {productData.sizes && productData.sizes.length > 0 ? (
              <>
                <span className="text-xl font-semibold">Sizes: </span>
                <div className="flex flex-wrap items-center">
                  {productData.sizes && productData.sizes.length > 0
                    ? productData.sizes.map((size: string) => (
                        <span
                          key={size}
                          className="mb-2 mr-4 text-light-text dark:text-dark-text"
                        >
                          {size}: {productData.sizeQuantities?.get(size) || 0}
                        </span>
                      ))
                    : null}
                </div>
              </>
            ) : null}
            {productData.volumes && productData.volumes.length > 0 ? (
              <>
                <span className="text-xl font-semibold">Volumes: </span>
                <div className="flex flex-wrap items-center">
                  {productData.volumes && productData.volumes.length > 0
                    ? productData.volumes.map((volume: string) => (
                        <span
                          key={volume}
                          className="mb-2 mr-4 text-light-text dark:text-dark-text"
                        >
                          {volume}: {productData.volumePrices?.get(volume) || 0}{" "}
                          {productData.currency}
                        </span>
                      ))
                    : null}
                </div>
              </>
            ) : null}
            {productData.condition && (
              <>
                <div className="text-left text-xs text-light-text dark:text-dark-text">
                  <span className="text-xl font-semibold">Condition: </span>
                  <span className="text-xl">{productData.condition}</span>
                </div>
              </>
            )}
            {productData.quantity && (
              <>
                <div className="text-left text-xs text-light-text dark:text-dark-text">
                  <span className="text-xl font-semibold">Quantity: </span>
                  <span className="text-xl">{productData.quantity}</span>
                </div>
              </>
            )}
            {productData.restrictions && (
              <>
                <div className="text-left text-xs text-light-text dark:text-dark-text">
                  <span className="text-xl font-semibold">Restrictions: </span>
                  <span className="text-xl text-red-500">
                    {productData.restrictions}
                  </span>
                </div>
              </>
            )}
            {productData.required && (
              <>
                <div className="text-left text-xs text-light-text dark:text-dark-text">
                  <span className="text-xl font-semibold">
                    Required Customer Information:{" "}
                  </span>
                  <span className="text-xl">{productData.required}</span>
                </div>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <div className="flex w-full flex-wrap justify-evenly gap-2">
              <Button
                type="submit"
                className={SHOPSTRBUTTONCLASSNAMES}
                startContent={
                  <ShareIcon className="h-6 w-6 hover:text-yellow-500" />
                }
                onClick={() => {
                  handleShare().catch((e) => console.error(e));
                }}
              >
                Share
              </Button>
              {userPubkey === productData.pubkey && (
                <>
                  {productData.isExpired && (
                    <Button
                      type="button"
                      className={SHOPSTRBUTTONCLASSNAMES}
                      startContent={
                        <ArrowPathIcon className="h-6 w-6 hover:text-yellow-500" />
                      }
                      onClick={handleRenewListing}
                      isDisabled={renewLoading}
                      isLoading={renewLoading}
                    >
                      Renew Listing
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className={SHOPSTRBUTTONCLASSNAMES}
                    startContent={
                      <PencilSquareIcon className="h-6 w-6 hover:text-yellow-500" />
                    }
                    onClick={handleEditToggle}
                    isDisabled={deleteLoading}
                  >
                    Edit Listing
                  </Button>
                  <ConfirmActionDropdown
                    helpText="Are you sure you want to delete this listing?"
                    buttonLabel="Delete Listing"
                    onConfirm={beginDeleteListingProcess}
                  >
                    <Button
                      className="min-w-fit bg-gradient-to-tr from-red-600 via-red-500 to-red-600 text-white shadow-lg"
                      startContent={
                        <TrashIcon className="h-6 w-6 hover:text-yellow-500" />
                      }
                      isDisabled={deleteLoading}
                      isLoading={deleteLoading}
                    >
                      Delete Listing
                    </Button>
                  </ConfirmActionDropdown>
                </>
              )}
            </div>
            {renewError && (
              <p className="w-full text-center text-sm text-red-500 dark:text-red-300">
                {renewError}
              </p>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
      {userPubkey === productData.pubkey && (
        <ProductForm
          showModal={showProductForm}
          handleModalToggle={handleEditToggle}
          oldValues={productData}
          handleDelete={handleDelete}
          onSubmitCallback={handleModalToggle}
        />
      )}
      <SuccessModal
        bodyText={successModalMessage}
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </>
  );
}
