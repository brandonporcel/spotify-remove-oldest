import * as crypto from "crypto";

export function joinUrlParams(
  filterParams: Record<string, any>,
  url: string
): string {
  let firstParam = !url.includes("?");

  for (const property in filterParams) {
    if (filterParams[property]) {
      const trimmedValue = filterParams[property].toString().trim();
      const encodedValue = encodeURIComponent(trimmedValue);
      url += firstParam
        ? `?${property}=${encodedValue}`
        : `&${property}=${encodedValue}`;
      firstParam = false;
    }
  }

  return url;
}

export const generateRandomString = (length: number) =>
  crypto.randomBytes(60).toString("hex").slice(0, length);

export const getIdFromURL = (input: string): string | null => {
  if (/^[a-zA-Z0-9]+$/.test(input)) {
    return input;
  }

  const regex =
    /(?:https:\/\/)?(?:open.spotify.com\/playlist\/)([a-zA-Z0-9]+)(?:[?&].*)?/;

  const match = input.match(regex);

  return match ? match[1] : null;
};
