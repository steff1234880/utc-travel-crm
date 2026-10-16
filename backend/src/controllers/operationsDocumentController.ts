import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import path from 'path';
import fs from 'fs';
import { UPLOAD_DIR } from '../middleware/uploadMiddleware';
import { logOperationsActivity } from '../utils/auditLogger';

const sanitizeStr = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

// Helper: Resolve employeeId from req.user.userId
async function getEmployeeIdFromUserId(userId?: string): Promise<string | null> {
  if (!userId) return null;
  const emp = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  return emp ? emp.id : null;
}

// 1. GET /api/operations/documents
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, tourId, customerId, documentType, verificationStatus, expiryFilter, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { documentCode: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { tour: { tourReference: { contains: q, mode: 'insensitive' } } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (tourId) whereClause.tourId = tourId as string;
    if (customerId) whereClause.customerId = customerId as string;
    if (documentType && documentType !== 'ALL') whereClause.documentType = documentType as string;
    if (verificationStatus && verificationStatus !== 'ALL') whereClause.verificationStatus = verificationStatus as string;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (expiryFilter === 'EXPIRING_SOON' || expiryFilter === '7days') {
      whereClause.expiryDate = {
        gte: now,
        lte: sevenDaysFromNow,
      };
    } else if (expiryFilter === 'EXPIRED') {
      whereClause.expiryDate = {
        lt: now,
      };
    } else if (expiryFilter === 'VALID') {
      whereClause.OR = [
        { expiryDate: null },
        { expiryDate: { gt: now } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.operationsDocument.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          documentCode: true,
          tourId: true,
          customerId: true,
          documentType: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          expiryDate: true,
          verificationStatus: true,
          rejectionReason: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          tour: { select: { id: true, tourReference: true, destination: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.operationsDocument.count({ where: whereClause }),
    ]);

    res.status(200).json({
      documents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching operations documents:', error);
    res.status(500).json({ error: 'Failed to fetch operations documents' });
  }
};

// 2. POST /api/operations/documents (Upload)
export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No document file uploaded' });
      return;
    }

    const { tourId, customerId, documentType, expiryDate, notes } = req.body;

    if (!documentType || documentType.trim() === '') {
      // Clean file from disk if validation fails
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: 'Document type is required' });
      return;
    }

    const uploadedById = await getEmployeeIdFromUserId(req.user?.userId);
    if (!uploadedById) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(403).json({ error: 'Uploaded by Employee not found for current user' });
      return;
    }

    let parsedExpiryDate: Date | null = null;
    if (expiryDate && expiryDate.trim() !== '') {
      parsedExpiryDate = new Date(expiryDate);
      if (isNaN(parsedExpiryDate.getTime())) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(400).json({ error: 'Invalid document Expiry Date format' });
        return;
      }
    }

    const count = await prisma.operationsDocument.count();
    const documentCode = `OPDOC-${(count + 1).toString().padStart(4, '0')}`;

    const doc = await prisma.operationsDocument.create({
      data: {
        documentCode,
        tourId: sanitizeStr(tourId),
        customerId: sanitizeStr(customerId),
        documentType: documentType.trim(),
        fileName: req.file.originalname,
        storageKey: req.file.filename,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById,
        expiryDate: parsedExpiryDate,
        verificationStatus: 'Pending',
        notes: sanitizeStr(notes),
      },
      select: {
        id: true,
        documentCode: true,
        tourId: true,
        customerId: true,
        documentType: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        expiryDate: true,
        verificationStatus: true,
        notes: true,
        createdAt: true,
      },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'DOCUMENT_UPLOADED',
      entity: 'OperationsDocument',
      entityId: doc.id,
      details: `Uploaded document ${doc.documentCode} (${doc.fileName}) under ${doc.documentType}`,
    });

    res.status(201).json({ document: doc, message: 'Document uploaded successfully' });
  } catch (error: any) {
    console.error('Error uploading operations document:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
};

// 3. GET /api/operations/documents/:id
export const getDocumentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const doc = await prisma.operationsDocument.findUnique({
      where: { id },
      select: {
        id: true,
        documentCode: true,
        tourId: true,
        customerId: true,
        documentType: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        expiryDate: true,
        verificationStatus: true,
        rejectionReason: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tour: { select: { id: true, tourReference: true, destination: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document record not found' });
      return;
    }

    res.status(200).json(doc);
  } catch (error: any) {
    console.error('Error fetching document details:', error);
    res.status(500).json({ error: 'Failed to fetch document metadata' });
  }
};

// 4. GET /api/operations/documents/:id/download (Secure Authenticated Streaming)
export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const doc = await prisma.operationsDocument.findUnique({ where: { id } });
    if (!doc) {
      res.status(404).json({ error: 'Document record not found' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, doc.storageKey);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Document file not found on server storage' });
      return;
    }

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'DOCUMENT_DOWNLOADED',
      entity: 'OperationsDocument',
      entityId: doc.id,
      details: `Downloaded document ${doc.documentCode} (${doc.fileName})`,
    });

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader('Content-Length', doc.fileSize);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error downloading operations document:', error);
    res.status(500).json({ error: 'Failed to download document file' });
  }
};

// 5. PATCH /api/operations/documents/:id/verify
export const verifyDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { verificationStatus, rejectionReason } = req.body;

    if (!['Verified', 'Rejected', 'Pending'].includes(verificationStatus)) {
      res.status(400).json({ error: 'Invalid verificationStatus. Allowed: Verified, Rejected, Pending' });
      return;
    }

    const existing = await prisma.operationsDocument.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Document record not found' });
      return;
    }

    const updated = await prisma.operationsDocument.update({
      where: { id },
      data: {
        verificationStatus,
        rejectionReason: verificationStatus === 'Rejected' ? sanitizeStr(rejectionReason) : null,
      },
      select: {
        id: true,
        documentCode: true,
        fileName: true,
        verificationStatus: true,
        rejectionReason: true,
      },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: `DOCUMENT_${verificationStatus.toUpperCase()}`,
      entity: 'OperationsDocument',
      entityId: updated.id,
      details: `Set verification status of ${updated.documentCode} to ${verificationStatus}`,
    });

    res.status(200).json({ document: updated, message: `Document verification status updated to ${verificationStatus}` });
  } catch (error: any) {
    console.error('Error verifying operations document:', error);
    res.status(500).json({ error: 'Failed to verify document' });
  }
};

// 6. DELETE /api/operations/documents/:id
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const doc = await prisma.operationsDocument.findUnique({ where: { id } });
    if (!doc) {
      res.status(404).json({ error: 'Document record not found' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, doc.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Could not delete underlying document file:', err);
      }
    }

    await prisma.operationsDocument.delete({ where: { id } });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'DOCUMENT_DELETED',
      entity: 'OperationsDocument',
      entityId: id,
      details: `Deleted document ${doc.documentCode} (${doc.fileName})`,
    });

    res.status(200).json({ message: 'Document deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting operations document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};
