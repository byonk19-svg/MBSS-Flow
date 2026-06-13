import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { loadAppData, saveAppData } from './storage';
import type { AppData } from './types';

export function useAppData(): [AppData, Dispatch<SetStateAction<AppData>>] {
  const [data, setData] = useState<AppData>(() => loadAppData());

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  return [data, setData];
}
