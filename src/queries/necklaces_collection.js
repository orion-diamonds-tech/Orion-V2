export const GET_NECKLACES_COLLECTION = `
  query GetEarringsCollection {
    collection(handle: "necklaces") {
      title
      products(first: 50) {
        edges {
          node {
            id
            handle
            title
            description
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  sku
                  price {
                    amount
                    currencyCode
                  }
                  selectedOptions {
                    name
                    value
                  }
                  image {
                    url
                    altText
                  }
                }
              }
            }
            images(first: 10) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            featuredImage {
              url
              altText
            }
          }
        }
      }
    }
  }
`;
