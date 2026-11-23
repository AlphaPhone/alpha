# Notes folders

One folder per note, as the owner names them. The folder list is the owner's own document on the phone;
a note names its folder by ID in its record's rich data, so renaming a folder keeps every note in it and
deleting a folder never hides or trashes a note. Folder names are compared trimmed, single-spaced,
case-folded and in one Unicode form; the shell keeps the name as written beside the key compared here.

## Story: Keep my notes in folders I name

> As the owner, I want to make, rename and delete folders, with each name used once, and to find every
> note where I put it.

### A folder is created once per name, up to a hundred folders

A name that is already in use returns the existing folder instead of a second one. Names are 1 to 40
characters after collapsing spaces, with no NUL; the hundredth folder is the last.

```quint
type Folder = { id: str, key: str }
type FolderList = { folders: List[Folder], revision: int }
pure val initial: FolderList = { folders: List(), revision: 0 }
pure def keyUsed(key: str, s: FolderList): bool = s.folders.some(f => f.key == key)
pure def idUsed(id: str, s: FolderList): bool = s.folders.some(f => f.id == id)
pure def canCreateFolder(s: FolderList, id: str, key: str): bool =
  id != "" and key != "" and not(idUsed(id, s)) and (keyUsed(key, s) or s.folders.length() < 100)
pure def createFolder(s: FolderList, id: str, key: str): FolderList =
  if (keyUsed(key, s)) s else { folders: s.folders.append({ id: id, key: key }), revision: s.revision + 1 }
pure val idValues = Set("f-1", "f-2", "f-3")
pure val keyValues = Set("work", "home", "")
pure def alwaysKeysUnique(s: FolderList): bool = s.folders.every(f => s.folders.select(g => g.key == f.key).length() == 1)
pure def alwaysIdsUnique(s: FolderList): bool = s.folders.every(f => s.folders.select(g => g.id == f.id).length() == 1)
pure def alwaysAtMostAHundred(s: FolderList): bool = s.folders.length() <= 100 and s.revision >= 0
pure def alwaysNamesNotBlank(s: FolderList): bool = s.folders.every(f => f.key != "" and f.id != "")
```

### Renaming keeps the folder's ID, so every note stays in it

A folder takes a new name only if no other folder uses it. Its ID, and so its notes, are unchanged.

```quint
pure def canRenameFolder(s: FolderList, id: str, key: str): bool =
  key != "" and idUsed(id, s) and not(s.folders.some(f => f.key == key and f.id != id))
pure def renameFolder(s: FolderList, id: str, key: str): FolderList =
  { folders: s.folders.listMap(f => if (f.id == id) { ...f, key: key } else f), revision: s.revision + 1 }
pure def stepRenameKeepsMembership(before: FolderList, via: str, after: FolderList): bool =
  via == "renameFolder" implies after.folders.listMap(f => f.id) == before.folders.listMap(f => f.id)
pure def sometimesRenamed(s: FolderList): bool = s.revision >= 2 and s.folders.length() >= 1
```

### Deleting a folder removes it first, and its notes then read as in no folder

Nothing can be moved into a deleted folder. A note that still names it reads as in no folder, so an
interrupted release never hides a note; a note restored from Trash returns to its folder, or to none when
that folder is gone.

```quint
pure def canDeleteFolder(s: FolderList, id: str): bool = idUsed(id, s)
pure def deleteFolder(s: FolderList, id: str): FolderList = { folders: s.folders.select(f => f.id != id), revision: s.revision + 1 }
pure def folderOfNote(noteFolder: str, s: FolderList): str = if (noteFolder != "" and idUsed(noteFolder, s)) noteFolder else ""
pure def stepDeletedFolderIsGone(before: FolderList, via: str, after: FolderList): bool =
  via == "deleteFolder" implies after.folders.length() == before.folders.length() - 1
pure def sometimesDeleted(s: FolderList): bool = s.folders.length() == 0 and s.revision >= 2
```
