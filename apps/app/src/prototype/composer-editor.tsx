import { Component, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Surface = 'dock' | 'chat';
type Slots = Partial<Record<Surface, HTMLElement | null>>;
type Props = { slots: Slots; surface: Surface | null; keepFocus: boolean; field?: ReactNode };

/** The shell's two composer layouts share one editor. Park its portal before React removes
 * the outgoing layout, then move it straight into the incoming slot in the same commit. */
export class ComposerEditor extends Component<Props> {
  private readonly host = document.createElement('span');
  private parking: HTMLElement | null = null;

  constructor(props: Props) {
    super(props);
    this.host.style.display = 'contents';
  }

  private place() {
    const slot = this.props.surface && this.props.slots[this.props.surface];
    if (!slot) { this.host.remove(); return; }
    if (this.host.parentNode === slot) return;
    if (this.host.isConnected && this.props.keepFocus && slot.moveBefore) slot.moveBefore(this.host, null);
    else slot.append(this.host);
  }

  componentDidMount() { this.place(); }

  getSnapshotBeforeUpdate(previous: Props) {
    if (previous.surface === 'dock' && this.props.surface === 'chat' && this.props.keepFocus &&
        this.host.isConnected && this.host.contains(document.activeElement)) {
      // Older browsers still use the accepted-send focus restore after normal reparenting.
      this.parking?.moveBefore?.(this.host, null);
    }
    return null;
  }

  componentDidUpdate() { this.place(); }
  componentWillUnmount() { this.host.remove(); }

  private park = (node: HTMLElement | null) => { this.parking = node; };

  render() {
    return <><span ref={this.park} style={{display: 'contents'}} />{this.props.surface && createPortal(this.props.field, this.host)}</>;
  }
}
