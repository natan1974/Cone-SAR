
import React, { useState, useCallback } from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  Ruler, 
  Image as ImageIcon, 
  Send, 
  Save, 
  FileText,
  Loader2,
  Compass,
  CheckCircle2,
  Database,
  LocateFixed,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { INITIAL_DATA, PHOTO_LABELS, PANORAMIC_LABELS, ReportData, PhotoSlot, SavedReport, StoredImage } from './types';
import { Input, Select } from './components/Input';
import { Section } from './components/Section';
import { PhotoUpload } from './components/PhotoUpload';
import { dbService } from './db';

// Helper function to convert Decimal to Degrees Minutes Seconds
const decimalToDms = (val: string): string => {
  const decimal = parseFloat(val.replace(',', '.'));
  if (isNaN(decimal)) return '';

  const sign = decimal < 0 ? '-' : '';
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);

  return `${sign}${degrees}° ${minutes}' ${seconds}"`;
};

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// --- MASK HELPERS ---
const formatCep = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove non-digits
    .replace(/^(\d{5})(\d)/, '$1-$2') // Add dash
    .substring(0, 9); // Limit length
};

const formatPhone = (value: string) => {
  const clean = value.replace(/\D/g, '');
  const limit = clean.length > 11 ? 11 : clean.length; // Max 11 digits
  
  // (XX) XXXXX-XXXX
  if (clean.length > 10) {
    return clean
      .replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
  } 
  // (XX) XXXX-XXXX
  else if (clean.length > 5) {
     return clean
      .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  }
  // (XX) ...
  else if (clean.length > 2) {
    return clean.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
  }
  
  return clean;
};

// --- VALIDATION HELPERS ---
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// --- TABS DEFINITION ---
const TABS = [
  { id: 0, title: 'Geral & Localização', icon: <MapPin size={16} /> },
  { id: 1, title: 'Propriedade & Dono', icon: <User size={16} /> },
  { id: 2, title: 'Croqui', icon: <FileText size={16} /> },
  { id: 3, title: 'Fotos', icon: <ImageIcon size={16} /> },
  { id: 4, title: 'Panorâmicas', icon: <Compass size={16} /> }
];

export default function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [reportDate, setReportDate] = useState(getLocalDateString());
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Standard Photos (0-33)
  const [photos, setPhotos] = useState<PhotoSlot[]>(
    PHOTO_LABELS.map((label, index) => ({
      id: index,
      label,
      file: null,
      previewUrl: null
    }))
  );

  // Panoramic Photos (100-111)
  const [panoramas, setPanoramas] = useState<PhotoSlot[]>(
    PANORAMIC_LABELS.map((label, index) => ({
      id: 100 + index,
      label,
      file: null,
      previewUrl: null
    }))
  );

  const [croqui, setCroqui] = useState<PhotoSlot>({
    id: 999,
    label: "CROQUI DE SITUAÇÃO",
    file: null,
    previewUrl: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // Apply Masks
    if (name === 'zipCode') {
      value = formatCep(value);
    }
    if (name === 'ownerPhone' || name === 'adminPhone') {
      value = formatPhone(value);
    }

    // Clear validation error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-convert coordinates if reading fields change
      if (name === 'latRead') {
        newData.latConv = decimalToDms(value);
      }
      if (name === 'longRead') {
        newData.longConv = decimalToDms(value);
      }

      // Auto-calculate Total Area (Width * Depth)
      if (name === 'dimensionsW' || name === 'dimensionsD') {
        const width = parseFloat(newData.dimensionsW.replace(',', '.'));
        const depth = parseFloat(newData.dimensionsD.replace(',', '.'));
        
        if (!isNaN(width) && !isNaN(depth)) {
          // Calculation logic based on screenshot: 10 * 15 = 150
          const total = (width * depth).toFixed(2).replace('.', ',');
          newData.totalArea = total;
        }
      }

      return newData;
    });
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Email Validation
    if ((name === 'ownerEmail' || name === 'adminEmail') && value) {
      if (!isValidEmail(value)) {
        setErrors(prev => ({ ...prev, [name]: 'E-mail inválido' }));
      }
    }

    // CEP Fetching
    if (name === 'zipCode') {
      const cep = value.replace(/\D/g, '');
      
      if (cep.length === 8) {
        setIsLoadingCep(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const addressData = await response.json();
          
          if (!addressData.erro) {
            setData(prev => ({
              ...prev,
              address: addressData.logradouro || prev.address,
              neighborhood: addressData.bairro || prev.neighborhood,
              city: addressData.localidade || prev.city,
              state: addressData.uf || prev.state,
            }));
          }
        } catch (error) {
          console.error("Erro ao buscar CEP", error);
        } finally {
          setIsLoadingCep(false);
        }
      }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setNotification({ type: 'error', message: 'Geolocalização não suportada neste navegador.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const long = position.coords.longitude.toFixed(6);
        const alt = position.coords.altitude ? position.coords.altitude.toFixed(2) : '';

        setData(prev => ({
          ...prev,
          latRead: lat,
          longRead: long,
          altitude: alt,
          latConv: decimalToDms(lat),
          longConv: decimalToDms(long)
        }));
        
        setIsLocating(false);
        setNotification({ type: 'success', message: 'Coordenadas atualizadas com sucesso!' });
        setTimeout(() => setNotification(null), 3000);
      },
      (error) => {
        console.error("Error getting location", error);
        setIsLocating(false);
        let msg = 'Erro ao obter localização.';
        if (error.code === 1) msg = 'Permissão de localização negada.';
        if (error.code === 2) msg = 'Localização indisponível.';
        if (error.code === 3) msg = 'Tempo limite esgotado ao buscar localização.';
        
        setNotification({ type: 'error', message: msg });
        setTimeout(() => setNotification(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePhotoUpload = useCallback((id: number, file: File) => {
    const url = URL.createObjectURL(file);
    
    if (id === 999) {
      setCroqui(prev => {
        if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { ...prev, file, previewUrl: url };
      });
      return;
    }

    if (id >= 100 && id < 200) {
      setPanoramas(prev => prev.map(p => {
        if (p.id === id) {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          return { ...p, file, previewUrl: url };
        }
        return p;
      }));
      return;
    }

    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        return { ...p, file, previewUrl: url };
      }
      return p;
    }));
  }, []);

  const handlePhotoRemove = useCallback((id: number) => {
    if (id === 999) {
      setCroqui(prev => {
        if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { ...prev, file: null, previewUrl: null };
      });
      return;
    }

    if (id >= 100 && id < 200) {
       setPanoramas(prev => prev.map(p => {
        if (p.id === id) {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          return { ...p, file: null, previewUrl: null };
        }
        return p;
      }));
      return;
    }

    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
        return { ...p, file: null, previewUrl: null };
      }
      return p;
    }));
  }, []);

  const prepareDataForSave = (status: 'DRAFT' | 'SUBMITTED'): SavedReport => {
    // Collect all images
    const imagesToStore: StoredImage[] = [];

    // Croqui
    if (croqui.file) {
      imagesToStore.push({
        slotId: croqui.id,
        label: croqui.label,
        file: croqui.file,
        type: 'croqui'
      });
    }

    // Panoramas
    panoramas.forEach(p => {
      if (p.file) {
        imagesToStore.push({
          slotId: p.id,
          label: p.label,
          file: p.file,
          type: 'panorama'
        });
      }
    });

    // Standard Photos
    photos.forEach(p => {
      if (p.file) {
        imagesToStore.push({
          slotId: p.id,
          label: p.label,
          file: p.file,
          type: 'standard'
        });
      }
    });

    return {
      date: reportDate,
      createdAt: Date.now(),
      status,
      formData: data,
      images: imagesToStore
    };
  };

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    // Basic validation for SUBMITTED
    if (status === 'SUBMITTED') {
      const formHasErrors = Object.keys(errors).length > 0;
      if (formHasErrors) {
         setNotification({
          type: 'error',
          message: 'Corrija os erros de validação antes de enviar.'
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    setIsSubmitting(true);
    setNotification(null);
    
    try {
      const reportPayload = prepareDataForSave(status);
      const id = await dbService.saveReport(reportPayload);
      
      console.log(`Relatório salvo com ID: ${id} | Status: ${status}`);
      
      setNotification({
        type: 'success',
        message: status === 'DRAFT' 
          ? 'Rascunho salvo com sucesso na base de dados!' 
          : 'Relatório enviado com sucesso para a base de dados!'
      });

      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);

    } catch (error) {
      console.error("Erro ao salvar:", error);
      setNotification({
        type: 'error',
        message: 'Erro ao salvar no banco de dados. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextTab = () => {
    if (currentTab < TABS.length - 1) {
      setCurrentTab(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevTab = () => {
    if (currentTab > 0) {
      setCurrentTab(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg text-white animate-fade-in flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <Database size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SAR</h1>
              <p className="text-xs text-primary-100 font-medium opacity-90">Site Acquisition Report</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-primary-200 font-semibold uppercase tracking-wider mb-0.5">Data do Relatório</span>
              <input 
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="bg-primary-800/50 border border-primary-600 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-sm [color-scheme:dark]"
              />
            </div>

            <button 
              onClick={() => handleSave('DRAFT')}
              disabled={isSubmitting}
              className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition-colors text-sm font-medium h-[42px]"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span className="hidden lg:inline">Salvar Rascunho</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Tab Navigation Bar */}
        <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex min-w-max space-x-1 md:space-x-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            {TABS.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                  `}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                  {tab.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Dados do Empreendimento, Localização & Coordenadas */}
        {currentTab === 0 && (
          <div className="animate-fade-in space-y-6">
            <Section title="Dados do Empreendimento" icon={<Building2 size={20} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Select 
                  label="Tipo do Site" 
                  name="siteType" 
                  value={data.siteType}
                  onChange={handleInputChange}
                  options={[
                    { value: 'GREENFIELD', label: 'GREENFIELD' },
                    { value: 'ROOFTOP', label: 'ROOFTOP' },
                    { value: 'INDOOR', label: 'INDOOR' }
                  ]}
                />
                <Select 
                  label="Status Negociação" 
                  name="status"
                  value={data.status}
                  onChange={handleInputChange}
                  options={[
                    { value: 'EM NEGOCIAÇÃO', label: 'EM NEGOCIAÇÃO' },
                    { value: 'CONTRATADO', label: 'CONTRATADO' },
                    { value: 'CANCELADO', label: 'CANCELADO' }
                  ]}
                />
                <Select 
                  label="Tipo de E.V" 
                  name="structureType"
                  value={data.structureType}
                  onChange={handleInputChange}
                  options={[
                    { value: 'TORRE', label: 'TORRE' },
                    { value: 'POSTE', label: 'POSTE' },
                    { value: 'MASTRO', label: 'MASTRO' }
                  ]}
                />
                <Input 
                  label="Altura Prevista EV (m)" 
                  name="heightEv" 
                  type="number" 
                  value={data.heightEv}
                  onChange={handleInputChange}
                />
                <Input 
                  label="Altura Pré-Comar (m)" 
                  name="heightPreComar" 
                  type="number" 
                  value={data.heightPreComar}
                  onChange={handleInputChange}
                />
                <Input 
                  label="Valor Pleiteado (R$)" 
                  name="pleadedValue" 
                  placeholder="0,00" 
                  value={data.pleadedValue}
                  onChange={handleInputChange}
                />
              </div>
            </Section>

            <Section title="Localização & Coordenadas" icon={<MapPin size={20} />}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="relative md:col-span-1">
                  <Input 
                    label="CEP" 
                    name="zipCode" 
                    placeholder="00000-000" 
                    value={data.zipCode} 
                    onChange={handleInputChange} 
                    onBlur={handleBlur}
                    maxLength={9}
                  />
                  {isLoadingCep && (
                    <div className="absolute right-3 top-8 text-primary-600 animate-spin">
                      <Loader2 size={16} />
                    </div>
                  )}
                </div>
                
                <Input className="md:col-span-2" label="Rua (Logradouro)" name="address" value={data.address} onChange={handleInputChange} />
                <Input className="md:col-span-1" label="Número" name="number" placeholder="S/N" value={data.number} onChange={handleInputChange} />
                
                <Input label="Bairro" name="neighborhood" value={data.neighborhood} onChange={handleInputChange} />
                <Input label="Cidade" name="city" value={data.city} onChange={handleInputChange} />
                <Input label="Estado" name="state" value={data.state} onChange={handleInputChange} />
                
                <Select 
                  label="Dentro do Search Ring?" 
                  name="insideSearchRing"
                  value={data.insideSearchRing}
                  onChange={handleInputChange}
                  options={[
                    { value: 'SIM', label: 'SIM' },
                    { value: 'NÃO', label: 'NÃO' }
                  ]}
                />
                <Input className="md:col-span-1" label="Distância PN" name="distancePn" value={data.distancePn} onChange={handleInputChange} />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                    Coordenadas
                    <span className="text-xs font-normal normal-case text-slate-500">(Preencha a leitura para conversão automática)</span>
                  </h3>
                  
                  <button 
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                    USAR GPS DO DISPOSITIVO
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Leitura (Decimal) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <span className="text-xs font-bold text-primary-700 uppercase">Leitura (Decimal)</span>
                    </div>
                    <Input 
                      label="Latitude" 
                      name="latRead" 
                      placeholder="-00.000000" 
                      value={data.latRead} 
                      onChange={handleInputChange} 
                    />
                    <Input 
                      label="Longitude" 
                      name="longRead" 
                      placeholder="-00.000000" 
                      value={data.longRead} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Conversor (GMS) */}
                  <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-slate-200">
                    <div className="col-span-2">
                      <span className="text-xs font-bold text-primary-700 uppercase">Conversor (Graus, Min, Seg)</span>
                    </div>
                    <Input 
                      label="Latitude GMS" 
                      name="latConv" 
                      placeholder="-00° 00' 00''" 
                      value={data.latConv} 
                      onChange={handleInputChange}
                      readOnly
                      className="bg-slate-50 text-slate-600"
                    />
                    <Input 
                      label="Longitude GMS" 
                      name="longConv" 
                      placeholder="-00° 00' 00''" 
                      value={data.longConv} 
                      onChange={handleInputChange}
                      readOnly
                      className="bg-slate-50 text-slate-600"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Input label="Altitude (m)" name="altitude" value={data.altitude} onChange={handleInputChange} className="md:w-1/3" />
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Tab 2: Proprietário e Propriedade */}
        {currentTab === 1 && (
          <div className="animate-fade-in space-y-6">
            <Section title="Dados do Proprietário" icon={<User size={20} />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input className="md:col-span-2" label="Nome Proprietário" name="ownerName" value={data.ownerName} onChange={handleInputChange} />
                <Select 
                  label="Tipo Pessoa" 
                  name="ownerType"
                  value={data.ownerType}
                  onChange={handleInputChange}
                  options={[
                    { value: 'FISICA', label: 'FÍSICA' },
                    { value: 'JURIDICA', label: 'JURÍDICA' }
                  ]}
                />
                <Input 
                  label="Email" 
                  name="ownerEmail" 
                  type="email" 
                  value={data.ownerEmail} 
                  onChange={handleInputChange} 
                  onBlur={handleBlur}
                  error={errors.ownerEmail}
                />
                <Input 
                  label="Telefone" 
                  name="ownerPhone" 
                  value={data.ownerPhone} 
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <Input className="md:col-span-3" label="Endereço Completo" name="ownerAddress" value={data.ownerAddress} onChange={handleInputChange} />
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Representante / Administrador</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input label="Nome" name="adminName" value={data.adminName} onChange={handleInputChange} />
                  <Input 
                    label="Telefone" 
                    name="adminPhone" 
                    value={data.adminPhone} 
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                  <Input 
                    label="Email" 
                    name="adminEmail" 
                    value={data.adminEmail} 
                    onChange={handleInputChange} 
                    onBlur={handleBlur}
                    error={errors.adminEmail}
                  />
                </div>
              </div>
            </Section>

            <Section title="Informações sobre a Propriedade" icon={<Ruler size={20} />}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Select 
                  label="Tipo Propriedade" 
                  name="propertyType"
                  value={data.propertyType}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Terreno Urbano', label: 'Terreno Urbano' },
                    { value: 'Terreno Rural', label: 'Terreno Rural' },
                    { value: 'Edificação', label: 'Edificação Comercial' }
                  ]}
                />
                <Select 
                  label="Edificação Existente?" 
                  name="hasBuilding"
                  value={data.hasBuilding}
                  onChange={handleInputChange}
                  options={[
                    { value: 'SIM', label: 'SIM' },
                    { value: 'NÃO', label: 'NÃO' }
                  ]}
                />
                <Select 
                  label="Estado Conservação" 
                  name="conservationStatus"
                  value={data.conservationStatus}
                  onChange={handleInputChange}
                  options={[
                    { value: 'BOM', label: 'BOM' },
                    { value: 'REGULAR', label: 'REGULAR' },
                    { value: 'RUIM', label: 'RUIM' }
                  ]}
                />
                <Select 
                  label="Zoneamento" 
                  name="zoning"
                  value={data.zoning}
                  onChange={handleInputChange}
                  options={[
                    { value: 'Residencial', label: 'Residencial' },
                    { value: 'Comercial', label: 'Comercial' },
                    { value: 'Industrial', label: 'Industrial' },
                    { value: 'Misto', label: 'Misto' }
                  ]}
                />
                
                <Input label="Largura Disp. (m)" name="dimensionsW" placeholder="10,00" value={data.dimensionsW} onChange={handleInputChange} />
                <Input label="Profundidade Disp. (m)" name="dimensionsD" placeholder="15,00" value={data.dimensionsD} onChange={handleInputChange} />
                <Input 
                  label="Área Total (m²)" 
                  name="totalArea" 
                  placeholder="150,00" 
                  value={data.totalArea} 
                  onChange={handleInputChange} 
                  readOnly
                  className="bg-slate-50 text-slate-700 font-semibold"
                />
                
                <Select 
                  label="Outras Op. Raio 500m?" 
                  name="otherOperatorsNearby"
                  value={data.otherOperatorsNearby}
                  onChange={handleInputChange}
                  options={[
                    { value: 'SIM', label: 'SIM' },
                    { value: 'NÃO', label: 'NÃO' }
                  ]}
                />
                {data.otherOperatorsNearby === 'SIM' && (
                  <>
                    <Input label="Quais Operadoras?" name="operatorNames" placeholder="Ex: Vivo, Tim" value={data.operatorNames} onChange={handleInputChange} />
                    <Input label="Distância (m)" name="operatorDistance" placeholder="50.00" value={data.operatorDistance} onChange={handleInputChange} />
                  </>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* Tab 3: Croqui */}
        {currentTab === 2 && (
          <div className="animate-fade-in">
            <Section title="Croqui de Situação" icon={<MapPin size={20} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="text-sm text-slate-600 space-y-2">
                  <p><strong>O Croqui deve mencionar:</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Distância de outras ERBs</li>
                    <li>Nome de Ruas e Rodovias</li>
                    <li>Distância de áreas críticas</li>
                    <li>Distância da Rede Elétrica</li>
                    <li>Acesso à área locada</li>
                    <li>Norte Verdadeiro</li>
                  </ul>
                </div>
                <div className="h-64">
                  <PhotoUpload 
                    slot={croqui} 
                    onUpload={handlePhotoUpload} 
                    onRemove={handlePhotoRemove} 
                  />
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Tab 4: Relatório Fotográfico */}
        {currentTab === 3 && (
          <div className="animate-fade-in">
            <Section title="Relatório Fotográfico" icon={<ImageIcon size={20} />}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((slot) => (
                  <div key={slot.id} className="h-48 md:h-56">
                    <PhotoUpload 
                      slot={slot} 
                      onUpload={handlePhotoUpload} 
                      onRemove={handlePhotoRemove} 
                    />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Tab 5: Panorâmicas */}
        {currentTab === 4 && (
          <div className="animate-fade-in">
            <Section title="Fotos Panorâmicas" icon={<Compass size={20} />}>
              <div className="mb-4 text-center">
                <p className="text-red-600 font-bold text-sm italic">
                  Tirar fotos de pontos altos de forma a mostrar os objetivos de cobertura
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {panoramas.map((slot) => (
                  <div key={slot.id} className="h-48 md:h-56">
                    <PhotoUpload 
                      slot={slot} 
                      onUpload={handlePhotoUpload} 
                      onRemove={handlePhotoRemove} 
                    />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <button 
            type="button"
            onClick={prevTab}
            disabled={currentTab === 0}
            className={`
              flex items-center gap-2 px-6 py-3 text-slate-700 font-semibold text-sm rounded-md transition-colors
              ${currentTab === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-slate-100'}
            `}
          >
            <ChevronLeft size={18} />
            ANTERIOR
          </button>

          {currentTab < TABS.length - 1 ? (
            <button 
              onClick={nextTab}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-md font-bold text-sm shadow-lg hover:bg-primary-700 active:bg-primary-800 transition-all"
            >
              PRÓXIMO
              <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              onClick={() => handleSave('SUBMITTED')}
              disabled={isSubmitting}
              className={`
                flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-md font-bold text-sm shadow-lg
                hover:bg-green-700 active:bg-green-800 transition-all
                ${isSubmitting ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  SALVANDO...
                </>
              ) : (
                <>
                  <Send size={18} />
                  ENVIAR RELATÓRIO
                </>
              )}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
