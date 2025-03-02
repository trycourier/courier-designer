import React, { createContext, useContext, useCallback, ReactNode, useEffect } from 'react';
import axios from 'axios';
// import { ElementalContent } from '@/types';

interface CourierTemplateContextType {
  // saveTemplate: (content: ElementalContent) => Promise<void>;
  saveTemplate: () => Promise<void>;
  getTemplate: (id: string) => Promise<void>;
}

interface CourierTemplateProviderProps {
  children: ReactNode;
  templateId: string;
  tenantId: string;
  token: string;
  apiUrl?: string;
}

const CourierTemplateContext = createContext<CourierTemplateContextType | undefined>(undefined);

// export const useCourierTemplate = (): { getTemplate: (id: string) => Promise<void>, saveTemplate: (content: ElementalContent) => Promise<void> } => {
export const useCourierTemplate = (): { getTemplate: (id: string) => Promise<void>, saveTemplate: () => Promise<void> } => {
  const context = useContext(CourierTemplateContext);

  if (!context) {
    console.error('useCourierTemplate must be used within a CourierTemplateProvider');
    return { getTemplate: async () => { }, saveTemplate: async () => { } };
  }

  return { getTemplate: context.getTemplate, saveTemplate: context.saveTemplate };
};

export const CourierTemplateProvider: React.FC<CourierTemplateProviderProps> = ({
  children,
  // templateId,
  // tenantId,
  // token,
  apiUrl,
}) => {
  const getTemplate = useCallback(async (id: string) => {
    const response = await axios({
      url: apiUrl,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN',
      },
      data: {
        query: `
          query GetPHoto($id: ID!) {
            photo(id: $id) {
              id
              url
              title
            }
          }
        `,
        variables: {
          id
        }
      }
    });

    return response.data;
  }, [])

  const saveTemplate = useCallback(async () => {
    const response = await axios({
      url: apiUrl,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN',
      },
      data: {
        query: `
          mutation CreatePhoto($input: CreatePhotoInput!) {
            createPhoto(input: $input) {
              url
              title
              thumbnailUrl
            }
          }
        `,
        variables: {
          input: {
            title: "Example Photo",
            url: "https://example.com/photo.jpg",
            thumbnailUrl: "https://example.com/photo.jpg",
          }
        }
      }
    });

    return response.data;
  }, [])

  // useEffect(() => {
  //   async function fetchTemplate() {
  //     const response = await saveTemplate()
  //     console.log("response", response.data)
  //   }

  //   fetchTemplate()
  // }, []);

  useEffect(() => {
    async function fetchTemplate() {
      const response = await getTemplate("123")
      console.log("response", response.data)
    }

    fetchTemplate()
  }, []);

  // const saveTemplate = useCallback(async (content: ElementalContent) => {
  //   try {
  //     await axios.put(
  //       // `${apiUrl}/${templateId}`,
  //       `${apiUrl}`,
  //       {
  //         tenantId,
  //         content,
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           'Content-Type': 'application/json',
  //         },
  //       }
  //     );
  //   } catch (error) {
  //     console.error('Error saving template:', error);
  //     throw error;
  //   }
  // }, [templateId, tenantId, token]);

  return (
    <CourierTemplateContext.Provider value={{ saveTemplate, getTemplate }}>
      {children}
    </CourierTemplateContext.Provider>
  );
};