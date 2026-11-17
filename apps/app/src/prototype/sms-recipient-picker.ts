import {isIncompleteAddressBookContact,type AddressBookClient} from '../../../../.eliza/client-features/packages/contracts/src/native-address-book.ts';
import {normalizePhoneNumber} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';

type Reader=Pick<AddressBookClient,'status'|'requestPermissions'|'list'>;
type Choice={key:string;name:string;number:string};

/** Keeps only the name and number of each eligible contact for the current compose visit. */
export function createSmsRecipientPicker(book:Reader, inFront:()=>boolean, changed:()=>void) {
  let opened=false, revision=0, query='', next:string|null=null, rows:Choice[]=[];
  let busy=false, needsAccess=false, notice='';
  let searchTimer:ReturnType<typeof setTimeout>|undefined;

  function resetPage() {
    clearTimeout(searchTimer);searchTimer=undefined;
    ++revision;
    next=null;
    rows=[];
    busy=false;
    needsAccess=false;
    notice='';
  }
  function close() {
    if(!opened)return false;
    opened=false;
    query='';
    resetPage();
    return true;
  }
  async function read(request:boolean, more:boolean) {
    if(!opened||!inFront()||busy||(request&&!needsAccess)||(more&&!next))return;
    const token=++revision, search=query.trim(), cursor=more?next??undefined:undefined;
    const current=()=>opened&&inFront()&&token===revision;
    busy=true;
    notice='';
    changed();
    try {
      const access=await (request?book.requestPermissions():book.status());
      if(!current())return;
      needsAccess=access.available&&!access.readable;
      if(!access.readable) {
        rows=[];
        next=null;
        notice=needsAccess?'Allow Contacts access to choose a number.':'Contacts unavailable';
        return;
      }
      const page=await book.list(search,50,cursor);
      if(!current())return;
      const choices=new Map((more?rows:[]).map(row=>[row.key,row]));
      for(const contact of page.contacts) {
        if(isIncompleteAddressBookContact(contact))continue;
        for(const raw of contact.phones) {
          const number=normalizePhoneNumber(raw);
          if(!number)continue;
          const key=contact.id+':'+number;
          choices.set(key,{key,name:contact.name||number,number});
        }
      }
      rows=[...choices.values()];
      next=page.next;
      notice=rows.length?'':next?'No phone numbers on this page.':'No matching phone numbers.';
    } catch {
      if(!current())return;
      rows=[];
      next=null;
      notice='Couldn’t load Contacts. Try again.';
    } finally {
      if(current()) {
        busy=false;
        changed();
      }
    }
  }
  return {
    snapshot:()=>opened?{query,rows,busy,needsAccess,notice,more:!!next}:null,
    open() {
      if(opened||!inFront())return;
      opened=true;
      void read(false,false);
    },
    close,
    setQuery(value:string) {
      if(!opened||!inFront()||value===query)return;
      query=value;
      resetPage();
      changed();
      searchTimer=setTimeout(()=>{searchTimer=undefined;void read(false,false);},180);
    },
    search:()=>read(false,false),
    allow:()=>read(true,false),
    more:()=>read(false,true),
    selected:(row:Choice)=>opened&&inFront()&&!busy&&rows.includes(row)?row.number:null,
  };
}
