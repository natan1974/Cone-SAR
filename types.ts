export interface PhotoSlot {
  id: number;
  label: string;
  file: File | null;
  previewUrl: string | null;
}

export interface ReportData {
  // Dados do Empreendimento
  siteType: string;
  heightEv: string;
  heightPreComar: string;
  structureType: string;
  pleadedValue: string;
  status: string;

  // Localização
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  insideSearchRing: string;
  distancePn: string;
  
  // Coordenadas
  latRead: string;
  longRead: string;
  latConv: string;
  longConv: string;
  altitude: string;

  // Proprietário
  ownerName: string;
  ownerType: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAddress: string; // Simplified for UI
  
  // Admin/Rep
  adminName: string;
  adminPhone: string;
  adminEmail: string;

  // Propriedade
  propertyType: string;
  conservationStatus: string;
  hasBuilding: string;
  needsDemolition: string;
  demolitionResponsible: string;
  freeArea: string;
  dimensionsW: string;
  dimensionsD: string;
  totalArea: string;
  zoning: string;
  vegetationSuppression: string;
  suppressionResponsible: string;
  otherOperatorsNearby: string;
  operatorNames: string;
  operatorDistance: string;
}

export const INITIAL_DATA: ReportData = {
  siteType: 'GREENFIELD',
  heightEv: '40.00',
  heightPreComar: '100.00',
  structureType: 'TORRE',
  pleadedValue: '',
  status: 'EM NEGOCIAÇÃO',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  insideSearchRing: 'SIM',
  distancePn: '',
  latRead: '',
  longRead: '',
  latConv: '',
  longConv: '',
  altitude: '',
  ownerName: '',
  ownerType: 'FISICA',
  ownerEmail: '',
  ownerPhone: '',
  ownerAddress: '',
  adminName: 'NA',
  adminPhone: 'NA',
  adminEmail: 'NA',
  propertyType: 'Terreno Urbano',
  conservationStatus: 'BOM',
  hasBuilding: 'NÃO',
  needsDemolition: 'NÃO',
  demolitionResponsible: 'N/A',
  freeArea: 'SIM',
  dimensionsW: '',
  dimensionsD: '',
  totalArea: '',
  zoning: 'Residencial',
  vegetationSuppression: 'NÃO',
  suppressionResponsible: 'LOCADOR',
  otherOperatorsNearby: 'NÃO',
  operatorNames: '',
  operatorDistance: ''
};

export const PANORAMIC_LABELS = [
  "0° (NV)",
  "30° (NV)",
  "60° (NV)",
  "90° (NV)",
  "120° (NV)",
  "150° (NV)",
  "180° (NV)",
  "210° (NV)",
  "240° (NV)",
  "270° (NV)",
  "300° (NV)",
  "330° (NV)"
];

export const PHOTO_LABELS = [
  "1 - VISTA FRONTAL DO IMÓVEL",
  "2 - VISTA FRONTAL DO IMÓVEL",
  "3 - VISTA PLACA DE RUA",
  "4 - VISTA Nº DO IMÓVEL",
  "5 - VISTA LOCAL DO SITE",
  "6 - VISTA LOCAL DO SITE",
  "7 - VISTA LOCAL DO SITE",
  "8 - VISTA LOCAL DO SITE",
  "9 - VISTA LOCAL DO SITE",
  "10 - VISTA LOCAL DO SITE",
  "11 - VISTA DO POSSÍVEL LOCAL DE ACESSO",
  "12 - VISTA DO POSSÍVEL LOCAL DE ACESSO",
  "13 - VISTA CALÇADA SITE SENTIDO DIREITA",
  "14 - VISTA CALÇADA SITE SENTIDO ESQUERDA",
  "15 - VISTA VIZINHO LADO DIREITO",
  "16 - VISTA VIZINHO LADO ESQUERDO",
  "17 - VISTA LOGRADOURO SENTIDO A DIREITA",
  "18 - VISTA LOGRADOURO SENTIDO A ESQUERDA",
  "19 - VISTA LOCAL MEDIDOR MAIS PRÓXIMO",
  "20 - VISTA MEDIDOR",
  "21 - VISTA POSTE EXISTENTE MAIS PRÓXIMO",
  "22 - VISTA REDE EXISTENTE NO LOGRADOURO",
  "23 - VISTA REDE EXISTENTE NO LOGRADOURO",
  "24 - VISTA DETALHE REDE EXISTENTE",
  "25 - VISTA POSTE COM TRANSFORMADOR",
  "26 - VISTA DETALHE TRANSFORMADOR",
  "27 - FOTO EXTRA",
  "28 - FOTO EXTRA",
  "29 - FOTO EXTRA",
  "30 - FOTO EXTRA",
  "31 - FOTO EXTRA",
  "32 - FOTO EXTRA",
  "33 - FOTO EXTRA",
  "34 - FOTO EXTRA"
];