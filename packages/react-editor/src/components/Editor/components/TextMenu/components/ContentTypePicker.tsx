import { Icon } from '@/components/Editor/components'
import { Button } from '@/components/ui-kit'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui-kit/DropdownMenu'
import { icons } from 'lucide-react'
import { RefObject, useMemo } from 'react'

export type ContentTypePickerOption = {
  label: string
  id: string
  type: 'option'
  disabled: () => boolean
  isActive: () => boolean
  onClick: () => void
  icon?: keyof typeof icons
}

export type ContentTypePickerCategory = {
  label: string
  id: string
  type: 'category'
}

export type ContentPickerOptions = Array<ContentTypePickerOption | ContentTypePickerCategory>

export type ContentTypePickerProps = {
  options: ContentPickerOptions
  containerRef?: RefObject<HTMLDivElement>
}

const isOption = (option: ContentTypePickerOption | ContentTypePickerCategory): option is ContentTypePickerOption =>
  option.type === 'option'

export const ContentTypePicker = ({ options, containerRef }: ContentTypePickerProps) => {
  const activeItem = useMemo(() => options.find(option => option.type === 'option' && option.isActive()), [options])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center justify-center font-normal">
          {activeItem?.label || 'Normal text'}
          <Icon name="ChevronDown" className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent portalProps={{ container: containerRef?.current || undefined }}>
        {options.map(option => {
          if (isOption(option)) {
            return (
              <DropdownMenuItem key={option.id} onClick={option.onClick} className={option.isActive() ? 'bg-accent text-foreground' : ''}>
                {option.id.startsWith('heading') ?
                  <>{option.id === 'heading1' ? <h1 className="text-2xl font-bold">{option.label}</h1> :
                    option.id === 'heading2' ? <h2 className="text-xl font-bold">{option.label}</h2> :
                      option.id === 'heading3' ? <h3 className="text-lg font-bold">{option.label}</h3> :
                        option.label}</> :
                  option.label}
              </DropdownMenuItem>
            )
          }
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
