import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const TOP_K = 5;

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    private embedding: EmbeddingService,
  ) {}

  private async getUserOrgIds(userId: string): Promise<string[]> {
    const members = await this.prisma.orgMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return members.map((m) => m.organizationId);
  }

  private async canAccessKnowledgeBase(kbId: string, userId: string) {
    const orgIds = await this.getUserOrgIds(userId);
    return this.prisma.knowledgeBase.findFirst({
      where: {
        id: kbId,
        OR: [
          { userId },
          ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
        ],
      },
    });
  }

  async createKnowledgeBase(userId: string, name: string, organizationId?: string) {
    if (organizationId) {
      const member = await this.prisma.orgMember.findFirst({
        where: { organizationId, userId },
      });
      if (!member) throw new ForbiddenException('شما عضو این سازمان نیستید');
    }
    return this.prisma.knowledgeBase.create({
      data: { userId, name, organizationId: organizationId || null },
    });
  }

  async listKnowledgeBases(userId: string, organizationId?: string) {
    const orgIds = await this.getUserOrgIds(userId);
    const baseWhere: any = {
      OR: [
        { userId },
        ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
      ],
    };
    const where = organizationId
      ? { AND: [baseWhere, { organizationId }] }
      : baseWhere;
    return this.prisma.knowledgeBase.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  async addDocument(kbId: string, userId: string, name: string, content: string) {
    const kb = await this.canAccessKnowledgeBase(kbId, userId);
    if (!kb) throw new ForbiddenException('دسترسی به این پایگاه دانش ندارید');

    const doc = await this.prisma.document.create({
      data: { knowledgeBaseId: kbId, name, content },
    });

    const chunks = this.chunkText(content);
    for (const chunk of chunks) {
      const embedding = await this.embedding.embed(chunk);
      await this.prisma.documentChunk.create({
        data: {
          documentId: doc.id,
          content: chunk,
          embedding: JSON.stringify(embedding),
        },
      });
    }

    return doc;
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    const clean = text.replace(/\r\n/g, '\n').trim();
    while (start < clean.length) {
      let end = Math.min(start + CHUNK_SIZE, clean.length);
      if (end < clean.length) {
        const nextNewline = clean.indexOf('\n', end - 80);
        if (nextNewline > start) end = nextNewline + 1;
      }
      chunks.push(clean.slice(start, end).trim());
      start = end - CHUNK_OVERLAP;
      if (start < 0) start = end;
    }
    return chunks.filter((c) => c.length > 0);
  }

  async search(kbId: string, userId: string, query: string, topK = TOP_K) {
    const kb = await this.canAccessKnowledgeBase(kbId, userId);
    if (!kb) throw new ForbiddenException('دسترسی به این پایگاه دانش ندارید');

    const queryEmbedding = await this.embedding.embed(query);
    const chunks = await this.prisma.documentChunk.findMany({
      where: { document: { knowledgeBaseId: kbId } },
      include: { document: { select: { name: true } } },
    });

    const scored = chunks.map((c) => {
      const emb = JSON.parse(c.embedding) as number[];
      const score = this.embedding.cosineSimilarity(queryEmbedding, emb);
      return { ...c, score };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(({ content, score, document }) => ({
      content,
      score,
      documentName: document.name,
    }));
  }

  async getDocuments(kbId: string, userId: string) {
    const kb = await this.canAccessKnowledgeBase(kbId, userId);
    if (!kb) throw new ForbiddenException('دسترسی به این پایگاه دانش ندارید');
    return this.prisma.document.findMany({
      where: { knowledgeBaseId: kbId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });
  }

  async deleteDocument(kbId: string, userId: string, documentId: string) {
    const kb = await this.canAccessKnowledgeBase(kbId, userId);
    if (!kb) throw new ForbiddenException('دسترسی به این پایگاه دانش ندارید');
    await this.prisma.document.deleteMany({
      where: { id: documentId, knowledgeBaseId: kbId },
    });
    return { success: true };
  }

  async deleteKnowledgeBase(kbId: string, userId: string) {
    const kb = await this.canAccessKnowledgeBase(kbId, userId);
    if (!kb) throw new ForbiddenException('دسترسی به این پایگاه دانش ندارید');
    await this.prisma.knowledgeBase.delete({ where: { id: kbId } });
    return { success: true };
  }
}
