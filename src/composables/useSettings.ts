import * as z from 'zod'
import { useStorageArea } from './useStorageArea'

export type Settings = z.infer<typeof SCHEMA>

const SCHEMA = z
  .object({
    bgColor: z.string().default('#000000'),
    bgImage: z.boolean().default(true),
    bgBlur: z.boolean().default(true),
  })

export function useSettings() {
  return useStorageArea(
    'settings',
    {
      bgColor: '#000000',
      bgImage: true,
      bgBlur: true,
    },
    {
      parse: data => SCHEMA.parse(SCHEMA.safeParse(data).data ?? {}),
    },
  )
}
