import { useLayoutEffect } from 'react';

export function usePageMeta(page: string, title: string) {
  useLayoutEffect(() => {
    document.body.dataset.page = page;
    document.title = title;
  }, [page, title]);
}
