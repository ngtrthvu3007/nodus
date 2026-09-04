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
    state.value = { ...defaultState(), ...options, isOpen: true };
  };

  const close = () => {
    state.value.isOpen = false;
  };

  return { state, open, close };
};
