export const NotionSchemas = {
  Accounts: {
    title: 'Accounts',
    description: 'Connected Gmail Accounts',
    properties: {
      'Email': { title: {} },
      'Account Name': { rich_text: {} },
      'Status': { select: { options: [{ name: 'Active', color: 'green' }, { name: 'Disconnected', color: 'red' }] } },
      'Last Sync': { date: {} },
      'Gmail History ID': { rich_text: {} },
      'Last Message ID': { rich_text: {} },
    }
  },
  Feeds: {
    title: 'Feeds',
    description: 'Email tagging and routing rules',
    properties: {
      'Feed Name': { title: {} },
      'Domains': { multi_select: {} },
      'Keywords': { multi_select: {} },
      'Accounts': { multi_select: {} },
    }
  },
  Emails: {
    title: 'Emails',
    description: 'Synced email records',
    properties: {
      'Subject': { title: {} },
      'Sender Email': { email: {} },
      'Received Date': { date: {} },
      'Feeds': { multi_select: {} },
      'Message ID': { rich_text: {} },
      'Duplicates': { relation: {} } // Self relation will need to be added later or carefully configured
    }
  },
  Calendar: {
    title: 'Calendar',
    description: 'Extracted calendar events from emails',
    properties: {
      'Event Title': { title: {} },
      'Event Date': { date: {} }
    }
  }
};
