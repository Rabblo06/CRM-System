'use client';

import { useEffect, useState } from 'react';
import { useCustomFields } from '@/hooks/useCustomFields';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';

type Module = 'contacts' | 'companies' | 'deals';

interface Props {
  module: Module;
  recordId: string;
}

export function CustomFieldsSection({ module, recordId }: Props) {
  const { getDefinitions, getValues } = useCustomFields();
  const [defs, setDefs] = useState<CustomFieldDefinition[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!recordId) return;
    Promise.all([getDefinitions(module), getValues(recordId)]).then(([definitions, values]) => {
      setDefs(definitions);
      const map: Record<string, string> = {};
      values.forEach((v) => { map[v.field_key] = v.value; });
      setVals(map);
      setLoaded(true);
    });
  }, [recordId, module]);

  if (!loaded) return null;

  const filled = defs.filter((d) => vals[d.key]);
  if (filled.length === 0) return null;

  return (
    <div className="bg-white border border-[#DFE3EB] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[#2D3E50] mb-4">Custom fields</h2>
      <div className="grid grid-cols-2 gap-4">
        {filled.map((d) => (
          <div key={d.key}>
            <p className="text-xs text-[#7C98B6] mb-0.5">{d.name}</p>
            <p className="text-sm text-[#2D3E50]">{vals[d.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
