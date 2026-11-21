import { Component, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Surface = 'dock' | 'chat';
type Slots = Partial<Record<Surface, HTMLElement | null>>;
type Props = { slots: Slots; surface: Surface | null; field?: ReactNode };

/** The shell's two layouts share one editor. The selected slot stays fixed
 * during a focused send. An explicit layout change can move the unfocused editor. */
export class ComposerEditor extends Component<Props> {
  private readonly host = document.createElement('span');

  constructor(props: Props) {
    super(props);
    this.host.style.display = 'contents';
  }

  private place() {
    const slot = this.props.surface && this.props.slots[this.props.surface];
    if (!slot) { this.host.remove(); return; }
    if (this.host.parentNode !== slot) slot.append(this.host);
  }

  componentDidMount() { this.place(); }

  componentDidUpdate() { this.place(); }
  componentWillUnmount() { this.host.remove(); }

  render() {
    return this.props.surface && createPortal(this.props.field, this.host);
  }
}
