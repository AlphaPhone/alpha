import { Component, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Surface = 'dock' | 'chat';
type Slots = Partial<Record<Surface, HTMLElement | null>>;
type Props = { slots: Slots; surface: Surface | null; onDockReleased?: () => void; field?: ReactNode };

/** The shell's two composer layouts share one editor. During Send, the outgoing
 * dock stays connected until the editor moves directly into the visible chat slot. */
export class ComposerEditor extends Component<Props> {
  private readonly host = document.createElement('span');

  constructor(props: Props) {
    super(props);
    this.host.style.display = 'contents';
  }

  private place() {
    const slot = this.props.surface && this.props.slots[this.props.surface];
    if (!slot) { this.host.remove(); return; }
    if (this.host.parentNode === slot) return;
    if (this.props.onDockReleased && this.host.isConnected && slot.moveBefore) {
      slot.moveBefore(this.host, null);
      this.props.onDockReleased();
    } else {
      slot.append(this.host);
    }
  }

  componentDidMount() { this.place(); }

  componentDidUpdate() { this.place(); }
  componentWillUnmount() { this.host.remove(); }

  render() {
    return this.props.surface && createPortal(this.props.field, this.host);
  }
}
