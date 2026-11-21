import {addNotesFolder,editNotesFolders,findNotesFolderByName,newNotesFolderId,readNotesFolders,removeNotesFolder,renameNotesFolder,type NotesFolder} from '../runtime/notes-folders';
import type {ShellHost,ShellPrototype,ViewApi,ViewOutput,ViewRegistry,ViewState} from './shell-types';
/** A field agent-adapter attaches to the shell. */
type NotesShell=ShellHost&{live?:boolean};
type NotesFoldersApi={create(name:string):Promise<NotesFolder|null>;rename(id:string,name:string):Promise<boolean>;remove(id:string):Promise<boolean>;reload():Promise<void>};
type NotesApi=ViewApi&{notesFolders?:NotesFoldersApi};
type NotesState=ViewState&{foldersLoaded?:boolean};
type MenuDetail={menuShown?:boolean;[action:string]:unknown};
type NotesOutput=ViewOutput&{ed?:MenuDetail;vo?:MenuDetail;lk?:MenuDetail};

/**
 * Notes folders kept from the earlier folder layout. The folder list is its own
 * encrypted slot (runtime/notes-folders); a note names its folder by `folderId` in the notes
 * collection. The Notes view is one flat list with no folder controls: it only reads `folders`
 * from the view state for the agent's list filter. api.notesFolders still creates, renames or
 * deletes a stored folder; renaming keeps the id, so membership is unchanged. Deleting a folder removes it first, so nothing can be
 * moved into it, then moves its notes to no folder (specs/notes-view DeleteFolder,
 * FolderRefsValid): a reference left behind by an interrupted release reads as no folder.
 */
export function installNotesFoldersAdapter(Component:{prototype:ShellPrototype},views:ViewRegistry){
 const notes=views.notes,render=notes.render;
 const p=Component.prototype,originalApi=p.api;
 let loading:Promise<void>|null=null;

 async function load(shell:NotesShell){
  try{const doc=await readNotesFolders();if(shell.live)shell.vset('notes',{folders:doc.folders,foldersLoaded:true});}
  catch{if(shell.live)shell.vset('notes',{folders:[],foldersLoaded:true});}
 }
 async function create(shell:NotesShell,name:string):Promise<NotesFolder|null>{
  try{
   const doc=await editNotesFolders(current=>addNotesFolder(current,{id:newNotesFolderId(),name,createdAt:Date.now()}));
   if(shell.live)shell.vset('notes',{folders:doc.folders,foldersLoaded:true});
   return findNotesFolderByName(doc,name)??null;
  }catch{shell.toast('Not created');void load(shell);return null;}
 }
 async function rename(shell:NotesShell,id:string,name:string):Promise<boolean>{
  try{
   const doc=await editNotesFolders(current=>renameNotesFolder(current,id,name));
   if(shell.live)shell.vset('notes',{folders:doc.folders,foldersLoaded:true});
   return doc.folders.some(folder=>folder.id===id&&folder.name===name.replace(/\s+/g,' ').trim());
  }catch(error){shell.toast(String((error as Error)?.message)==='Folder name in use'?'Name in use':'Rename failed');void load(shell);return false;}
 }
 async function remove(shell:NotesShell,id:string):Promise<boolean>{
  try{
   const doc=await editNotesFolders(current=>removeNotesFolder(current,id));
   if(shell.live)shell.vset('notes',{folders:doc.folders});
  }catch{shell.toast('Delete failed');void load(shell);return false;}
  // Agent notes keep their folderId; a reference to a deleted folder reads as no folder.
  return true;
 }

 p.api=function(this:NotesShell,key:string){
  const api:NotesApi=originalApi.call(this,key);
  if(key==='notes'){const shell=this;api.notesFolders={create:name=>create(shell,name),rename:(id,name)=>rename(shell,id,name),remove:id=>remove(shell,id),reload:()=>load(shell)};}
  return api;
 } as ShellPrototype['api'];
 notes.render=(state:NotesState,api:NotesApi)=>{
  const folders=api.notesFolders;
  if(!state.foldersLoaded&&!loading&&folders)loading=Promise.resolve().then(()=>folders.reload()).finally(()=>{loading=null;});
  const view=render(state,api) as NotesOutput;
  // A ⋯ menu action closes the menu and returns focus to ⋯ first, whichever adapter supplies the
  // action (the voice adapter replaces Delete), so a dialog it opens hands focus back to ⋯.
  for(const detail of [view.ed,view.vo,view.lk])if(detail?.menuShown)for(const key of ['pin','del']){
   const action=detail[key];if(typeof action!=='function')continue;
   detail[key]=async(...args:unknown[])=>{
    const more=document.querySelector<HTMLElement>('button[aria-haspopup="dialog"][aria-expanded="true"]');
    await api.set({menu:null});more?.focus();
    return action(...args);
   };
  }
  return view;
 };
}
