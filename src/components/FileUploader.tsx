import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTask } from 'firebase/storage';
import { storage } from '../utils/firebase';
import { UploadCloud, X, Loader2, Check, Trash2, Paperclip, AlertCircle, FileText, Film, Image as ImageIcon } from 'lucide-react';

interface FileUploaderProps {
  onUploadSuccess: (url: string, name: string, size: string) => void;
  onDeleteSuccess?: () => void;
  currentUrl?: string;
  allowedTypes: 'image' | 'video' | 'pdf' | 'any';
  maxSizeMB: number;
  label?: string;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onDeleteSuccess,
  currentUrl,
  allowedTypes,
  maxSizeMB,
  label,
  className = ''
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  // Helper to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enforce types and sizes
  const validateFile = (file: File): boolean => {
    setError('');

    // Check size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      setError(`O arquivo excede o limite de tamanho de ${maxSizeMB}MB.`);
      return false;
    }

    // Check MIME type
    const mime = file.type;
    if (allowedTypes === 'image' && !mime.startsWith('image/')) {
      setError('Formato inválido. Selecione uma imagem (PNG, JPG, JPEG, WEBP).');
      return false;
    }
    if (allowedTypes === 'video' && !mime.startsWith('video/')) {
      setError('Formato inválido. Selecione um vídeo (MP4, WEBM).');
      return false;
    }
    if (allowedTypes === 'pdf' && mime !== 'application/pdf') {
      setError('Formato inválido. Selecione um arquivo PDF.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startUpload(e.target.files[0]);
    }
  };

  const startUpload = (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setProgress(0);
    setError('');

    // Define standard directory based on types
    const folder = allowedTypes === 'image' ? 'images' 
                 : allowedTypes === 'video' ? 'videos' 
                 : allowedTypes === 'pdf' ? 'documents' 
                 : 'uploads';
                 
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExtension}`;
    const storageRef = ref(storage, uniqueFileName);

    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(percentage);
      },
      (err) => {
        setIsUploading(false);
        if (err.code === 'storage/canceled') {
          setError('Envio cancelado pelo usuário.');
        } else {
          setError('Erro ao enviar arquivo para o Storage. Tente novamente.');
          console.error('Firebase Storage upload error:', err);
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const formattedSize = formatBytes(file.size);
          setIsUploading(false);
          setProgress(100);
          onUploadSuccess(downloadUrl, file.name, formattedSize);
        } catch (err) {
          setIsUploading(false);
          setError('Erro ao obter a URL do arquivo.');
          console.error(err);
        }
      }
    );
  };

  const cancelUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      setIsUploading(false);
      setProgress(0);
    }
  };

  const removeFile = async () => {
    if (!currentUrl) return;
    
    // Only attempt to delete if it's a Firebase Storage URL
    if (currentUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const fileRef = ref(storage, currentUrl);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('Could not delete object from Storage (it may have been deleted already or permission was denied):', err);
      }
    }

    if (onDeleteSuccess) {
      onDeleteSuccess();
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-brand-clay uppercase tracking-wider block">
          {label}
        </label>
      )}

      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 bg-white border border-brand-wood/10 rounded-2xl shadow-sm text-xs">
          <div className="p-2 bg-brand-paper rounded-xl text-brand-wood">
            {allowedTypes === 'image' && <ImageIcon className="w-5 h-5" />}
            {allowedTypes === 'video' && <Film className="w-5 h-5" />}
            {allowedTypes === 'pdf' && <FileText className="w-5 h-5" />}
            {allowedTypes === 'any' && <Paperclip className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-ink truncate text-xs">Arquivo Selecionado</p>
            <a 
              href={currentUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-brand-wood hover:underline truncate text-[10px] block"
            >
              Visualizar Arquivo Original ↗
            </a>
          </div>

          <button
            type="button"
            onClick={removeFile}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
            title="Remover arquivo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            dragActive 
              ? 'border-brand-wood bg-brand-paper/50' 
              : 'border-brand-wood/20 hover:border-brand-wood/40 bg-brand-paper/10'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept={
              allowedTypes === 'image' ? 'image/*' 
              : allowedTypes === 'video' ? 'video/*' 
              : allowedTypes === 'pdf' ? 'application/pdf' 
              : '*/*'
            }
          />

          {isUploading ? (
            <div className="w-full space-y-3 px-4 py-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 font-bold text-brand-wood">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando ({progress}%)
                </span>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-red-500 hover:underline text-[10px] font-semibold flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              </div>
              <div className="w-full bg-brand-wood/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-brand-wood h-full rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="w-7 h-7 text-brand-clay" />
              <div className="space-y-0.5">
                <p className="text-xs text-brand-clay font-medium">
                  Arraste e solte o arquivo aqui ou <span className="text-brand-wood font-semibold hover:underline">clique para selecionar</span>
                </p>
                <p className="text-[9px] text-brand-clay/60">
                  {allowedTypes === 'image' && `Imagens (MÁX ${maxSizeMB}MB)`}
                  {allowedTypes === 'video' && `Vídeos MP4, WEBM (MÁX ${maxSizeMB}MB)`}
                  {allowedTypes === 'pdf' && `Documentos PDF (MÁX ${maxSizeMB}MB)`}
                  {allowedTypes === 'any' && `Qualquer arquivo (MÁX ${maxSizeMB}MB)`}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-xl text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
