// Declaração de tipos globais para o projeto

declare global {
  namespace svelteHTML {
    // Estender os atributos HTML para suportar onclick e outros event handlers do Svelte 5
    interface HTMLAttributes<T> {
      // Event handlers
      onclick?: (event: MouseEvent) => void;
      onkeydown?: (event: KeyboardEvent) => void;
      onsubmit?: (event: SubmitEvent) => void;
      oninput?: (event: Event) => void;
      onchange?: (event: Event) => void;
      onfocus?: (event: FocusEvent) => void;
      onblur?: (event: FocusEvent) => void;
      onmouseenter?: (event: MouseEvent) => void;
      onmouseleave?: (event: MouseEvent) => void;
      onmouseover?: (event: MouseEvent) => void;
      onmouseout?: (event: MouseEvent) => void;
      onmousedown?: (event: MouseEvent) => void;
      onmouseup?: (event: MouseEvent) => void;
      onscroll?: (event: Event) => void;
      onresize?: (event: UIEvent) => void;
      ontouchstart?: (event: TouchEvent) => void;
      ontouchend?: (event: TouchEvent) => void;
      ontouchmove?: (event: TouchEvent) => void;
      ontouchcancel?: (event: TouchEvent) => void;
    }
  }
}

export {};
