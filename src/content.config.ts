import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const articles = defineCollection({
  loader: glob({
    pattern: '{troslara,renhet,bon,allmosa,fasta,vallfard,blandat,biografier}/**/[!_]*.md',
    base: './content',
  }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    source: z.string().optional(),
    categories: z.array(z.string()),
    description: z.string().optional(),
    original_id: z.number().optional(),
  }),
})

export const collections = { articles }
