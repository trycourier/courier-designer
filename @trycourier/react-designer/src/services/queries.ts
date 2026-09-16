/**
 * The GraphQL documents the designer sends, lifted verbatim from the atom layer
 * they used to be embedded in. They live apart from the services so a schema
 * change is a diff in one file rather than a hunt through request builders.
 */

export const GET_TENANT = `
query GetTenant($tenantId: String!, $input: GetNotificationInput!, $brandInput: GetTenantBrandInput!, $includeBrand: Boolean!) {
  tenant(tenantId: $tenantId) {
    tenantId
    name
    notification(input: $input) {
      createdAt
      publishedAt
      notificationId
      data {
        content
        routing
      }
      version
    }

    brand(input: $brandInput) @include(if: $includeBrand) {
      brandId
      name
      settings {
        colors {
          primary
          secondary
          tertiary
        }
        email {
          # Drives the Frame's {brand.email.padding.*} refs — without
          # it a linked Frame silently reads as the 20px fallback.
          padding
          header {
            barColor
            logo {
              href
              image
            }
          }
          footer {
            markdown
            social {
              facebook {
                url
              }
              instagram {
                url
              }
              linkedin {
                url
              }
              medium {
                url
              }
              twitter {
                url
              }
            }
          }
        }
      }
    }
  }
}
`;

export const SAVE_NOTIFICATION = `
mutation SaveNotification($input: SaveNotificationInput!) {
  tenant {
    notification {
      save(input: $input)  {
        success
        version
        updatedAt
        createdAt
      }
    }
  }
}
`;

export const PUBLISH_NOTIFICATION = `
mutation PublishNotification($input: PublishNotificationInput!) {
  tenant {
    notification {
      publish(input: $input)  {
        success
        version
        publishedAt
      }
    }
  }
}
`;

export const SAVE_TENANT_BRAND = `
mutation SaveTenantBrand($input: SaveBrandSettingsInput!) {
  tenant {
    brand {
      updateSettings(input: $input) {
        success
      }
    }
  }
}
`;

export const PUBLISH_BRAND = `
mutation PublishNotification($input: PublishBrandInput!) {
  tenant {
    brand {
      publish(input: $input)  {
        success
      }
    }
  }
}
`;
