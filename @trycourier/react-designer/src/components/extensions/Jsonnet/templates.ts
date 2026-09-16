/**
 * Starter snippets offered in the sidebar's template dropdown, kept
 * byte-identical to the v1 designer's `jsonnet-block/templates/slack/*.jsonnet`
 * so a block created in either editor renders the same Block Kit payload.
 * The first entry doubles as the default for a newly inserted block.
 */
export interface JsonnetTemplate {
  label: string;
  template: string;
}

const button = `/*
    Example Event Data:
    {
        "buttonText": "Button Text",
        "buttonValue": "Button Value"
    }
*/

{
    "type": "actions",
    "elements": [
        {
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": data("buttonText"),
                "emoji": true
            },
            "value": data("buttonValue")
        }
    ]
}`;

const buttons = `/*
    Example Event Data:
    {
        "buttons": [{
            "text": "Button Text 1",
            "value": "Button Value 1"
        }, {
            "text": "Button Text 2",
            "value": "Button Value 2"
        }],
    }
*/

{
    "type": "actions",
    "elements": [
        {
            "type": "button",
            "text": {
                "type": "plain_text",
                "text": button.text,
                "emoji": true
            },
            "value": button.value
        }
        for button in data("buttons")
    ]
}`;

const textWithButton = `/*
    Example Event Data:
    {
        "text": "Some Magical Text!",
        "buttonText": "Click Me!",
        "buttonValue": "Button Value"
    }
*/

{
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": data("text")
    },
    "accessory": {
        "type": "button",
        "text": {
            "type": "plain_text",
            "text": data("buttonText"),
            "emoji": true
        },
        "value": data("buttonValue")
    }
}`;

const textWithImage = `/*
    Example Event Data:
    {
        "text": "Some Magical Text!",
        "imageUrl": "https://to-my-image.jpeg"
    }
*/

{
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": data("text")
    },
    [if data("imageUrl") != null then 'accessory']: {
        "type": "image",
        "image_url": data("imageUrl"),
        "alt_text": data("imageAltText", "backup alt text")
    }
}`;

const dropdown = `/*
    Example Event Data:
    {
        "dropdown": {
            "title": "My Dropdown List",
            "items": [{
                "title": "First",
                "value": "first"
            },{
                "title": "Second",
                "value": "second"
            }]
        }
    }
*/

{
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": data("dropdown.title")
    },
    "accessory": {
        "type": "static_select",
        "placeholder": {
            "type": "plain_text",
            "text": data("dropdown.items.0.title"),
            "emoji": true
        },
        "options": [
            {
                "text": {
                    "type": "plain_text",
                    "text": item.title,
                    "emoji": true
                },
                "value": item.value
            }
            for item in data("dropdown.items")
        ]
    }
}`;

export const jsonnetTemplates: JsonnetTemplate[] = [
  { label: "Button", template: button },
  { label: "Buttons (Using Loops)", template: buttons },
  { label: "Text With Button", template: textWithButton },
  { label: "Text With Image", template: textWithImage },
  { label: "Dropdown (Using Loops)", template: dropdown },
];

export const defaultJsonnetTemplate = jsonnetTemplates[0].template;
