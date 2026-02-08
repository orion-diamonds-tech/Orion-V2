export const GET_RINGS_COLLECTION = `
  query GetRingsCollection {
    collection(handle: "rings") {
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
