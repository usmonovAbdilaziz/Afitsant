import { prisma } from '@/lib/prisma';
import type { Business } from '@/generated/prisma/client';

export class BusinessRepository {
  /**
   * Fetch a business by its ID together with its child branches.
   * Returns null if not found.
   */
  static async getBusinessWithBranches(
    id: string,
  ): Promise<
    (Business & { children: Business[]; reviews: { rating: number }[] }) | null
  > {
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        children: true,
        reviews: { select: { rating: true } },
      },
    });
    return business as any; // cast because Prisma type does not include children by default
  }
}
