import {BrowserDocumentStore} from '../ui/platform/browser-document-store';

/** Alpha's browser-only document namespace; native stores retain their own adapters. */
export const browserDocuments=new BrowserDocumentStore('alpha.browser.documents.v1');
