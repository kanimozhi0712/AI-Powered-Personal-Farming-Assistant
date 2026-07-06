import { moduleMeta } from '../assets/index.js';

export function useModuleMeta(module) {
  return moduleMeta[module] || { label: module, icon: null };
}
