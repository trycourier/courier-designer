import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { ElementalContent } from '@/types';

interface CourierTemplateContextType {
  saveTemplate: (content: ElementalContent) => Promise<void>;
}

interface CourierTemplateProviderProps {
  children: ReactNode;
  templateId: string;
  tenantId: string;
  token: string;
}

const CourierTemplateContext = createContext<CourierTemplateContextType | undefined>(undefined);

export const useCourierTemplate = (): [undefined, (content: ElementalContent) => Promise<void>] => {
  const context = useContext(CourierTemplateContext);

  if (!context) {
    console.error('useCourierTemplate must be used within a CourierTemplateProvider');
    return [undefined, async () => { }];
  }

  return [undefined, context.saveTemplate];
};

export const CourierTemplateProvider: React.FC<CourierTemplateProviderProps> = ({
  children,
  templateId,
  tenantId,
  token,
}) => {
  const saveTemplate = useCallback(async (content: ElementalContent) => {
    try {
      await axios.put(
        `https://api.courier.com/templates/${templateId}`,
        {
          tenantId,
          content,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }, [templateId, tenantId, token]);

  return (
    <CourierTemplateContext.Provider value={{ saveTemplate }}>
      {children}
    </CourierTemplateContext.Provider>
  );
};