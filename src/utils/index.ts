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
