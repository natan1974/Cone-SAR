import React, { useRef } from 'react';
import { PhotoSlot } from '../types';
import { Camera, Trash2, UploadCloud } from 'lucide-react';

interface PhotoUploadProps {
  slot: PhotoSlot;
  onUpload: (id: number, file: File) => void;
  onRemove: (id: number) => void;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ slot, onUpload, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(slot.id, e.target.files[0]);
    }
  };

  const triggerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 min-h-[50px] flex items-center justify-center text-center">
        <span className="text-[10px] md:text-xs font-bold text-slate-700 uppercase leading-tight">
          {slot.label}
        </span>
      </div>

      {/* Image Area */}
      <div className="relative flex-grow bg-slate-100 min-h-[200px] flex flex-col items-center justify-center group">
        {slot.previewUrl ? (
          <>
            <img 
              src={slot.previewUrl} 
              alt={slot.label} 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button 
                onClick={triggerClick}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                title="Trocar Foto"
              >
                <Camera size={20} />
              </button>
              <button 
                onClick={() => onRemove(slot.id)}
                className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm"
                title="Remover Foto"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={triggerClick}
            className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors gap-2 p-4"
          >
            <UploadCloud size={32} />
            <span className="text-xs font-medium">Clique para adicionar</span>
          </button>
        )}
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};
