import { db } from "@virusmore/db";
import { aiDocs, pageHits } from "@virusmore/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "../index";
import { getOrFetchAnalysis } from "../services/virustotal";

const AnalysisTypeSchema = z.enum(["file", "url", "domain", "ip"]);

export const analysisRouter = {
	get: publicProcedure
		.input(
			z.object({
				type: AnalysisTypeSchema,
				id: z.string().min(1),
			}),
		)
		.handler(async ({ input }) => {
			const report = await getOrFetchAnalysis(input.type, input.id);

			// Track visit for future scraper priority queue
			await db
				.insert(pageHits)
				.values({
					analysisId: input.id,
					type: input.type,
					hitCount: 1,
				})
				.onConflictDoUpdate({
					target: pageHits.analysisId,
					set: {
						hitCount: sql`${pageHits.hitCount} + 1`,
						lastHit: new Date(),
					},
				});

			// Check if a doc is already available
			const doc = await db.query.aiDocs.findFirst({
				where: eq(aiDocs.analysisId, input.id),
			});

			return {
				report,
				hasDoc: doc?.isComplete ?? false,
				doc: doc?.isComplete ? doc.content : null,
			};
		}),
};
