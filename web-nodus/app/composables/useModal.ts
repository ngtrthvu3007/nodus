import type { Component } from "vue";

export interface ModalFormComponent {
  submit: () => unknown;
}

interface ModalOptions {
  title: string;
  component?: Component;
  props?: Record<string, unknown>;
  confirmLabel?: string;
  confirmColor?: "primary" | "error" | "neutral";
  message?: string;
  onConfirm: (data: unknown) => unknown;
}

interface ModalState extends ModalOptions {
  isOpen: boolean;
}

const defaultState = (): ModalState => ({
  isOpen: false,
  title: "",
  component: undefined,
  props: undefined,
  confirmLabel: "Confirm",
  confirmColor: "primary",
  message: undefined,
  onConfirm: () => {},
});

const state = ref<ModalState>(defaultState());

export const useModal = () => {
  const open = (options: ModalOptions) => {
    // markRaw: component definition không được bọc reactive trong state (Vue cảnh báo + tốn chi phí).
    const component = options.component && markRaw(options.component);
    state.value = { ...defaultState(), ...options, component, isOpen: true };
  };

  const close = () => {
    state.value.isOpen = false;
  };

  return { state, open, close };
};
