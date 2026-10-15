// Fixed messages keep provider response bodies and credentials out of the UI.
export function pinataErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Pinata rejected the upload credentials (401). Check that PINATA_JWT contains the complete JWT, not the API key or API secret, then redeploy.";
    case 403:
      return "Pinata denied this upload (403). Check the key's public-file upload permissions and your Pinata account restrictions.";
    case 402:
      return "Pinata requires an account or billing change (402). Check your Pinata plan and usage limits.";
    case 413:
      return "Pinata rejected the file size (413). Try a smaller image and check your account's upload limit.";
    case 429:
      return "Pinata's request limit was reached (429). Wait a moment before uploading again.";
    case 400:
    case 422:
      return `Pinata rejected the upload request (${status}). Check your API key's upload access and try another image.`;
    default:
      return `Pinata could not store the file (HTTP ${status}). ${status >= 500 ? "Pinata may be temporarily unavailable. Try again shortly." : "Check your Pinata account and upload settings."}`;
  }
}
