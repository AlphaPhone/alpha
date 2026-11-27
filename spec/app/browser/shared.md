# Browser shared types

Shared vocabulary for [Browser](./index.md) and the tab specs beside it.

## Story: Tell normal tabs from private tabs

> As the owner, I want normal and private tabs distinguished by one shared kind.

### A tab is normal or private

```quint
type Kind = Normal | Private
```
