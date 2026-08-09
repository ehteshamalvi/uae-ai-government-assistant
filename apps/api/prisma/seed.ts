import { PrismaClient, FieldSource, StepStatus, TransactionStatus, DocumentStatus, AnalysisStatus, InsightType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GovFlow AI sandbox data...');

  const permissions = [
    { code: 'transactions:read', description: 'View transactions' },
    { code: 'transactions:write', description: 'Create and update transactions' },
    { code: 'documents:upload', description: 'Upload documents' },
    { code: 'ai:invoke', description: 'Invoke AI features' },
    { code: 'admin:audit', description: 'View audit logs' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  const allPermissions = await prisma.permission.findMany();

  const userRole = await prisma.role.upsert({
    where: { code: 'USER' },
    update: {},
    create: {
      code: 'USER',
      name: 'User',
      description: 'Standard sandbox user',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Platform administrator',
    },
  });

  for (const permission of allPermissions) {
    const assignToAdmin = true;
    const assignToUser = permission.code !== 'admin:audit';

    if (assignToUser) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: userRole.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: userRole.id, permissionId: permission.id },
      });
    }

    if (assignToAdmin) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }
  }

  const passwordHash = await bcrypt.hash('DemoPass123!', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'khalid.demo@govflow.ai' },
    update: {
      fullName: 'Khalid Al-Mansoori',
      passwordHash,
      locale: 'en',
    },
    create: {
      email: 'khalid.demo@govflow.ai',
      fullName: 'Khalid Al-Mansoori',
      passwordHash,
      locale: 'en',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: demoUser.id, roleId: userRole.id } },
    update: {},
    create: { userId: demoUser.id, roleId: userRole.id },
  });

  const tradeLicense = await prisma.service.upsert({
    where: { code: 'TRADE_LICENSE_RENEWAL' },
    update: {},
    create: {
      code: 'TRADE_LICENSE_RENEWAL',
      nameEn: 'Trade License Renewal',
      nameAr: 'تجديد الرخصة التجارية',
      category: 'BUSINESS',
      description:
        'Sandbox demo service for preparing and reviewing a trade license renewal transaction.',
      metadata: {
        sandbox: true,
        estimatedSlaHours: 48,
        baseFeeAed: 2500,
        additionalFeeAed: 150,
        additionalFeeLabel: 'Knowledge Dirham / Admin',
      },
    },
  });

  // Keep fee metadata refreshed for existing seed rows
  await prisma.service.update({
    where: { id: tradeLicense.id },
    data: {
      metadata: {
        sandbox: true,
        estimatedSlaHours: 48,
        baseFeeAed: 2500,
        additionalFeeAed: 150,
        additionalFeeLabel: 'Knowledge Dirham / Admin',
      },
    },
  });

  const emiratesId = await prisma.service.upsert({
    where: { code: 'EMIRATES_ID_UPDATE' },
    update: {},
    create: {
      code: 'EMIRATES_ID_UPDATE',
      nameEn: 'Emirates ID Update',
      nameAr: 'تحديث الهوية الإماراتية',
      category: 'INDIVIDUAL',
      description: 'Sandbox demo service for Emirates ID information update preparation.',
      metadata: { sandbox: true, estimatedSlaHours: 24, baseFeeAed: 100, additionalFeeAed: 0 },
    },
  });
  await prisma.service.update({
    where: { id: emiratesId.id },
    data: {
      metadata: {
        sandbox: true,
        estimatedSlaHours: 24,
        baseFeeAed: 100,
        additionalFeeAed: 0,
      },
    },
  });

  const commercialPermit = await prisma.service.upsert({
    where: { code: 'COMMERCIAL_PERMIT' },
    update: {},
    create: {
      code: 'COMMERCIAL_PERMIT',
      nameEn: 'Commercial Permit',
      nameAr: 'تصريح تجاري',
      category: 'PERMIT',
      description: 'Sandbox demo service for commercial permit application preparation.',
      metadata: {
        sandbox: true,
        estimatedSlaHours: 72,
        baseFeeAed: 1200,
        additionalFeeAed: 50,
        additionalFeeLabel: 'Additional Fee',
      },
    },
  });
  await prisma.service.update({
    where: { id: commercialPermit.id },
    data: {
      metadata: {
        sandbox: true,
        estimatedSlaHours: 72,
        baseFeeAed: 1200,
        additionalFeeAed: 50,
        additionalFeeLabel: 'Additional Fee',
      },
    },
  });

  const tradeRequirements = [
    {
      type: 'FIELD' as const,
      code: 'COMPANY_NAME',
      labelEn: 'Company Name',
      labelAr: 'اسم الشركة',
      dataType: 'STRING' as const,
      sortOrder: 1,
    },
    {
      type: 'FIELD' as const,
      code: 'LICENSE_NUMBER',
      labelEn: 'License Number',
      labelAr: 'رقم الرخصة',
      dataType: 'STRING' as const,
      sortOrder: 2,
    },
    {
      type: 'FIELD' as const,
      code: 'LICENSE_TYPE',
      labelEn: 'License Type',
      labelAr: 'نوع الرخصة',
      dataType: 'STRING' as const,
      sortOrder: 3,
    },
    {
      type: 'FIELD' as const,
      code: 'EXPIRY_DATE',
      labelEn: 'Expiry Date',
      labelAr: 'تاريخ الانتهاء',
      dataType: 'DATE' as const,
      sortOrder: 4,
    },
    {
      type: 'FIELD' as const,
      code: 'RENEWAL_PERIOD',
      labelEn: 'Renewal Period',
      labelAr: 'فترة التجديد',
      dataType: 'STRING' as const,
      sortOrder: 5,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_TRADE_LICENSE',
      labelEn: 'Current Trade License Copy',
      labelAr: 'نسخة الرخصة التجارية الحالية',
      documentType: 'TRADE_LICENSE',
      sortOrder: 10,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_TENANCY',
      labelEn: 'Tenancy Contract',
      labelAr: 'عقد الإيجار',
      documentType: 'TENANCY_CONTRACT',
      sortOrder: 11,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_MOA',
      labelEn: 'Memorandum of Association',
      labelAr: 'عقد التأسيس',
      documentType: 'MOA',
      sortOrder: 12,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_EMIRATES_ID',
      labelEn: 'Emirates ID',
      labelAr: 'الهوية الإماراتية',
      documentType: 'EMIRATES_ID',
      sortOrder: 13,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_NOC',
      labelEn: 'NOC from relevant authority',
      labelAr: 'عدم ممانعة من الجهة المختصة',
      documentType: 'NOC',
      isMandatory: false,
      sortOrder: 14,
    },
  ];

  for (const requirement of tradeRequirements) {
    await prisma.serviceRequirement.upsert({
      where: {
        serviceId_code: { serviceId: tradeLicense.id, code: requirement.code },
      },
      update: {},
      create: {
        serviceId: tradeLicense.id,
        type: requirement.type,
        code: requirement.code,
        labelEn: requirement.labelEn,
        labelAr: requirement.labelAr,
        dataType: requirement.dataType,
        documentType: requirement.documentType,
        isMandatory: requirement.isMandatory ?? true,
        sortOrder: requirement.sortOrder,
      },
    });
  }

  const emiratesRequirements = [
    {
      type: 'FIELD' as const,
      code: 'FULL_NAME',
      labelEn: 'Full Name',
      labelAr: 'الاسم الكامل',
      dataType: 'STRING' as const,
      sortOrder: 1,
    },
    {
      type: 'FIELD' as const,
      code: 'EID_NUMBER',
      labelEn: 'Emirates ID Number',
      labelAr: 'رقم الهوية',
      dataType: 'STRING' as const,
      sortOrder: 2,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_PASSPORT',
      labelEn: 'Passport Copy',
      labelAr: 'نسخة جواز السفر',
      documentType: 'PASSPORT',
      sortOrder: 10,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_EMIRATES_ID',
      labelEn: 'Current Emirates ID',
      labelAr: 'الهوية الإماراتية الحالية',
      documentType: 'EMIRATES_ID',
      sortOrder: 11,
    },
  ];

  for (const requirement of emiratesRequirements) {
    await prisma.serviceRequirement.upsert({
      where: {
        serviceId_code: { serviceId: emiratesId.id, code: requirement.code },
      },
      update: {},
      create: {
        serviceId: emiratesId.id,
        type: requirement.type,
        code: requirement.code,
        labelEn: requirement.labelEn,
        labelAr: requirement.labelAr,
        dataType: requirement.dataType,
        documentType: requirement.documentType,
        isMandatory: true,
        sortOrder: requirement.sortOrder,
      },
    });
  }

  const permitRequirements = [
    {
      type: 'FIELD' as const,
      code: 'BUSINESS_ACTIVITY',
      labelEn: 'Business Activity',
      labelAr: 'النشاط التجاري',
      dataType: 'STRING' as const,
      sortOrder: 1,
    },
    {
      type: 'FIELD' as const,
      code: 'LOCATION',
      labelEn: 'Location',
      labelAr: 'الموقع',
      dataType: 'STRING' as const,
      sortOrder: 2,
    },
    {
      type: 'DOCUMENT' as const,
      code: 'DOC_TRADE_LICENSE',
      labelEn: 'Trade License',
      labelAr: 'الرخصة التجارية',
      documentType: 'TRADE_LICENSE',
      sortOrder: 10,
    },
  ];

  for (const requirement of permitRequirements) {
    await prisma.serviceRequirement.upsert({
      where: {
        serviceId_code: { serviceId: commercialPermit.id, code: requirement.code },
      },
      update: {},
      create: {
        serviceId: commercialPermit.id,
        type: requirement.type,
        code: requirement.code,
        labelEn: requirement.labelEn,
        labelAr: requirement.labelAr,
        dataType: requirement.dataType,
        documentType: requirement.documentType,
        isMandatory: true,
        sortOrder: requirement.sortOrder,
      },
    });
  }

  const existingTxn = await prisma.transaction.findUnique({
    where: { referenceCode: 'TRX-9824-A71' },
  });

  if (!existingTxn) {
    const readinessBreakdown = {
      score: 82,
      factors: {
        documents: { score: 80, available: 4, required: 5 },
        information: { score: 100, complete: 5, required: 5 },
        validation: { score: 90 },
        potentialIssues: { count: 1, penalty: 10 },
        missingRequirements: { count: 1, penalty: 10 },
      },
      summary:
        '4/5 documents available; information complete; 1 validation warning; 1 missing requirement.',
    };

    const transaction = await prisma.transaction.create({
      data: {
        referenceCode: 'TRX-9824-A71',
        userId: demoUser.id,
        serviceId: tradeLicense.id,
        status: TransactionStatus.PREPARING,
        title: 'Trade License Renewal',
        intentText:
          "My company's trade license expires next month. Can you prepare my renewal?",
        readinessScore: 82,
        readinessBreakdown,
        confidence: 0.91,
        sandbox: true,
        fields: {
          create: [
            {
              code: 'COMPANY_NAME',
              labelEn: 'Company Name',
              labelAr: 'اسم الشركة',
              value: 'Tech Innovations LLC',
              source: FieldSource.SYSTEM_VERIFIED,
              isVerified: true,
            },
            {
              code: 'LICENSE_NUMBER',
              labelEn: 'License Number',
              labelAr: 'رقم الرخصة',
              value: 'CN-784512',
              source: FieldSource.AI_EXTRACTED,
              confidence: 0.94,
            },
            {
              code: 'LICENSE_TYPE',
              labelEn: 'License Type',
              labelAr: 'نوع الرخصة',
              value: 'Commercial',
              source: FieldSource.USER_PROVIDED,
            },
            {
              code: 'EXPIRY_DATE',
              labelEn: 'Expiry Date',
              labelAr: 'تاريخ الانتهاء',
              value: '2026-09-15',
              dataType: 'DATE',
              source: FieldSource.AI_EXTRACTED,
              confidence: 0.88,
            },
            {
              code: 'RENEWAL_PERIOD',
              labelEn: 'Renewal Period',
              labelAr: 'فترة التجديد',
              value: '1 Year',
              source: FieldSource.USER_PROVIDED,
            },
          ],
        },
        steps: {
          create: [
            {
              code: 'SERVICE_IDENTIFIED',
              labelEn: 'Service Identified',
              labelAr: 'تم تحديد الخدمة',
              status: StepStatus.COMPLETED,
              sortOrder: 1,
              completedAt: new Date(),
            },
            {
              code: 'REQUIREMENTS_CHECKED',
              labelEn: 'Requirements Checked',
              labelAr: 'تم فحص المتطلبات',
              status: StepStatus.COMPLETED,
              sortOrder: 2,
              completedAt: new Date(),
            },
            {
              code: 'DOCUMENTS_VALIDATED',
              labelEn: 'Documents Validated',
              labelAr: 'تم التحقق من المستندات',
              status: StepStatus.COMPLETED,
              sortOrder: 3,
              completedAt: new Date(),
            },
            {
              code: 'APPLICATION_PREPARED',
              labelEn: 'Application Prepared',
              labelAr: 'تم إعداد الطلب',
              status: StepStatus.IN_PROGRESS,
              sortOrder: 4,
              startedAt: new Date(),
            },
            {
              code: 'USER_REVIEW',
              labelEn: 'User Review',
              labelAr: 'مراجعة المستخدم',
              status: StepStatus.PENDING,
              sortOrder: 5,
            },
            {
              code: 'SUBMISSION',
              labelEn: 'Submission',
              labelAr: 'التقديم',
              status: StepStatus.PENDING,
              sortOrder: 6,
            },
          ],
        },
        insights: {
          create: [
            {
              type: InsightType.READINESS,
              title: 'Transaction nearly ready',
              summary:
                'Your application is almost ready. One document requires attention before final submission.',
              severity: 'warning',
              evidence: readinessBreakdown,
            },
          ],
        },
      },
    });

    const docs = [
      {
        fileName: 'trade-license.pdf',
        documentType: 'TRADE_LICENSE',
        status: DocumentStatus.VALID,
        summary: 'Trade license copy verified in sandbox analysis.',
      },
      {
        fileName: 'tenancy-contract.pdf',
        documentType: 'TENANCY_CONTRACT',
        status: DocumentStatus.WARNING,
        summary: 'Tenancy contract expires soon and needs attention.',
      },
      {
        fileName: 'moa.pdf',
        documentType: 'MOA',
        status: DocumentStatus.VALID,
        summary: 'Memorandum of Association accepted.',
      },
      {
        fileName: 'emirates-id.jpg',
        documentType: 'EMIRATES_ID',
        status: DocumentStatus.WARNING,
        summary: 'Image quality is low; re-upload recommended.',
      },
    ];

    for (const doc of docs) {
      const created = await prisma.document.create({
        data: {
          userId: demoUser.id,
          transactionId: transaction.id,
          fileName: doc.fileName,
          mimeType: doc.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          storageKey: `sandbox/${transaction.id}/${doc.fileName}`,
          sizeBytes: 245760,
          documentType: doc.documentType,
          status: doc.status,
        },
      });

      await prisma.documentAnalysis.create({
        data: {
          documentId: created.id,
          status: AnalysisStatus.MOCK,
          provider: 'MOCK',
          classifiedType: doc.documentType,
          validationScore: doc.status === DocumentStatus.VALID ? 95 : 70,
          qualityScore: doc.status === DocumentStatus.VALID ? 0.92 : 0.55,
          summary: doc.summary,
          issues:
            doc.status === DocumentStatus.WARNING
              ? [{ code: 'QUALITY_OR_EXPIRY', severity: 'warning', message: doc.summary }]
              : [],
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: demoUser.id,
        action: 'TRANSACTION_CREATED',
        entityType: 'Transaction',
        entityId: transaction.id,
        metadata: { sandbox: true, referenceCode: transaction.referenceCode },
      },
    });

    console.log(`Created demo transaction ${transaction.referenceCode}`);
  }

  console.log('Seed complete.');
  console.log('Demo user: khalid.demo@govflow.ai / DemoPass123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
