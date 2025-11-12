export const ClientProjectStatus = {
  PENDING_PRINT: 'PENDING_PRINT',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  COMPLETED: 'COMPLETED',
} as const;

export type ClientProjectStatus = (typeof ClientProjectStatus)[keyof typeof ClientProjectStatus];

export const ClientProjectStatusList: ClientProjectStatus[] = [
  ClientProjectStatus.PENDING_PRINT,
  ClientProjectStatus.PENDING_PAYMENT,
  ClientProjectStatus.COMPLETED,
];
