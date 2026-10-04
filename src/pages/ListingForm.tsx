import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Upload, X, Loader2, GripVertical, Eye, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import imageCompression from "browser-image-compression";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ApartmentCard from "@/components/ApartmentCard";
import { Apartment, Media, MediaType } from "@/types";

const AMENITIES = [
  "WiFi", "Parking", "AC", "Kitchen", "Washer",
  "TV", "Pool", "Gym", "Pet Friendly", "Balcony",
];

/* ── Sortable media thumbnail ─────────────────────────── */
interface SortableMediaItemProps {
  id: number;
  item: Media;
  index: number;
  onRemove: (index: number) => void;
}

const SortableMediaItem = ({ id, item, index, onRemove }: SortableMediaItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative aspect-square group">
      {item.type === "video" ? (
        <video src={item.url} className="w-full h-full object-cover rounded-2xl" controls />
      ) : (
        <img src={item.url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover rounded-2xl" />
      )}
      <div {...attributes} {...listeners}
        className="absolute top-2 left-2 p-1 bg-background/80 backdrop-blur-sm rounded-lg cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4" />
      </div>
      <Button type="button" size="icon" variant="destructive"
        className="absolute top-2 right-2 h-7 w-7 rounded-full"
        onClick={() => onRemove(index)}>
        <X className="w-3.5 h-3.5" />
      </Button>
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded-full text-[10px] font-semibold uppercase">
        {item.type === "video" ? "Video" : "Image"} {index + 1}
      </div>
    </div>
  );
};

/* ── Section wrapper ──────────────────────────────────── */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-background rounded-2xl border p-5 space-y-4 animate-in fade-in duration-500">
    <h2 className="font-semibold text-base">{title}</h2>
    {children}
  </section>
);

/* ── Field wrapper ────────────────────────────────────── */
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {children}
  </div>
);

const inputClass = "rounded-xl border-muted bg-muted/40 focus:bg-background transition-colors";

/* ── Main component ───────────────────────────────────── */
const ListingForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", address: "", city: "", neighborhood: "",
    pricePerNight: "", bedrooms: "", bathrooms: "",
    amenities: [] as string[], availabilityStatus: "available",
    media: [] as Media[],
  });

  useEffect(() => { if (id) fetchListing(); }, [id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase.from("apartments").select("*").eq("id", id).single();
      if (error) throw error;
      const mediaArray = Array.isArray(data.media)
        ? data.media.map((m: any) => ({ url: m.url || m, type: (m.type || "image") as MediaType, thumbnail: m.thumbnail } as Media))
        : [];
      setFormData({
        name: data.name, description: data.description || "", address: data.address,
        city: data.city, neighborhood: data.neighborhood || "",
        pricePerNight: data.price_per_night.toString(), bedrooms: data.bedrooms.toString(),
        bathrooms: data.bathrooms.toString(), amenities: data.amenities || [],
        availabilityStatus: data.availability_status, media: mediaArray,
      });
    } catch (error: any) { toast.error("Failed to load listing"); console.error(error); }
  };

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      video.preload = 'metadata'; video.muted = true; video.playsInline = true;
      video.onloadedmetadata = () => { video.currentTime = 1; };
      video.onseeked = () => { canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx?.drawImage(video, 0, 0); resolve(canvas.toDataURL('image/jpeg', 0.7)); };
      video.onerror = () => { resolve(''); };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (formData.media.length + files.length > 10) { toast.error("Maximum 10 media files allowed"); return; }
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        let processedFile = file;
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) { toast.error(`${file.name} exceeds 50MB limit`); return null; }
        if (file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
          toast.info(`Compressing ${file.name}...`);
          try { processedFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true }); }
          catch { toast.warning(`Could not compress ${file.name}, uploading original`); }
        }
        if (file.type.startsWith("video/") && file.size > 10 * 1024 * 1024) {
          toast.warning(`${file.name} is large (${(file.size / 1024 / 1024).toFixed(1)}MB). Upload may take longer.`);
        }
        const fileExt = processedFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("profile-pictures").upload(fileName, processedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
        const mediaType: MediaType = file.type.startsWith("video/") ? "video" : "image";
        let thumbnail = undefined;
        if (mediaType === "video") { thumbnail = await generateVideoThumbnail(file); }
        return { url: publicUrl, type: mediaType, thumbnail } as Media;
      });
      const uploadedMedia = (await Promise.all(uploadPromises)).filter((item): item is Media => item !== null);
      if (uploadedMedia.length > 0) {
        setFormData((prev) => ({ ...prev, media: [...prev.media, ...uploadedMedia] }));
        toast.success("Media uploaded successfully");
      }
    } catch (error: any) { toast.error("Failed to upload media"); console.error(error); }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) files.push(file);
      }
    }
    if (files.length > 0) {
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      const syntheticEvent = { target: { files: dataTransfer.files, value: '' } } as React.ChangeEvent<HTMLInputElement>;
      await handleMediaUpload(syntheticEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

  const removeMedia = (index: number) => {
    setFormData((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.media.findIndex((_, i) => i === active.id);
        const newIndex = prev.media.findIndex((_, i) => i === over.id);
        return { ...prev, media: arrayMove(prev.media, oldIndex, newIndex) };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.city || !formData.pricePerNight || !formData.bedrooms || !formData.bathrooms) {
      toast.error("Please fill all required fields"); return;
    }
    if (formData.media.length === 0) { toast.error("At least 1 image or video is required"); return; }
    if (Number(formData.pricePerNight) <= 0) { toast.error("Price must be greater than 0"); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const apartmentData = {
        name: formData.name, description: formData.description || null,
        address: formData.address, city: formData.city,
        neighborhood: formData.neighborhood || null,
        price_per_night: Number(formData.pricePerNight),
        bedrooms: Number(formData.bedrooms), bathrooms: Number(formData.bathrooms),
        amenities: formData.amenities,
        availability_status: formData.availabilityStatus as "available" | "unavailable",
        media: formData.media as any, lister_id: user.id,
      };
      if (id) {
        const { error } = await supabase.from("apartments").update(apartmentData).eq("id", id);
        if (error) throw error;
        toast.success("Listing updated successfully");
      } else {
        const { error } = await supabase.from("apartments").insert(apartmentData);
        if (error) throw error;
        toast.success("Listing created successfully");
      }
      navigate("/profile");
    } catch (error: any) { toast.error("Failed to save listing"); console.error(error); }
    finally { setLoading(false); }
  };

  const previewApartment: Apartment | null = formData.name && formData.media.length > 0 ? {
    id: id || "preview", listerId: "", name: formData.name,
    description: formData.description || undefined,
    location: { address: formData.address, city: formData.city, neighborhood: formData.neighborhood || undefined },
    pricePerNight: Number(formData.pricePerNight) || 0,
    bedrooms: Number(formData.bedrooms) || 0, bathrooms: Number(formData.bathrooms) || 0,
    amenities: formData.amenities, media: formData.media,
    availabilityStatus: formData.availabilityStatus as "available" | "unavailable",
    averageRating: 0, totalReviews: 0, favoritesCount: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } : null;

  const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-muted/30 pb-40">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b pt-safe">
        <div className="flex items-center justify-between px-5 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate("/profile")}
              aria-label="Go back"
              className="w-11 h-11 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">{id ? "Edit Listing" : "New Listing"}</h1>
          </div>
          <button type="button" onClick={() => setShowPreview(true)} disabled={!previewApartment}
            className="flex items-center gap-1.5 min-h-[44px] px-2 text-sm font-medium text-primary disabled:opacity-40 transition-opacity">
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 pt-5 space-y-4">
        {/* Basic info */}
        <Section title="Basic Info">
          <Field label="Apartment Name" required>
            <Input className={inputClass} value={formData.name} onChange={(e) => update("name", e.target.value)} placeholder="Modern Downtown Apartment" />
          </Field>
          <Field label="Description">
            <Textarea className={`${inputClass} min-h-[100px]`} value={formData.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe your property..." maxLength={500} />
            <p className="text-xs text-muted-foreground">{formData.description.length}/500</p>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Bedrooms" required>
              <Input className={inputClass} type="number" min="0" value={formData.bedrooms} onChange={(e) => update("bedrooms", e.target.value)} />
            </Field>
            <Field label="Bathrooms" required>
              <Input className={inputClass} type="number" min="0" value={formData.bathrooms} onChange={(e) => update("bathrooms", e.target.value)} />
            </Field>
            <Field label="$/Night" required>
              <Input className={inputClass} type="number" min="1" value={formData.pricePerNight} onChange={(e) => update("pricePerNight", e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="Location">
          <Field label="Address" required>
            <Input className={inputClass} value={formData.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" required>
              <Input className={inputClass} value={formData.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="Neighborhood">
              <Input className={inputClass} value={formData.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* Amenities – pill selectors */}
        <Section title="Amenities">
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((amenity) => {
              const selected = formData.amenities.includes(amenity);
              return (
                <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                    ${selected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 text-foreground border-transparent hover:border-primary/30 hover:bg-muted"
                    }`}>
                  {amenity}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Media upload */}
        <Section title="Media">
          <p className="text-sm text-muted-foreground -mt-2">
            Upload up to 10 images & videos. Drag to reorder.
          </p>
          <div onDrop={handleDrop} onDragOver={handleDragOver}
            className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-4 transition-colors hover:border-primary/40">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={formData.media.map((_, i) => i)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-3 gap-3">
                  {formData.media.map((item, index) => (
                    <SortableMediaItem key={index} id={index} item={item} index={index} onRemove={removeMedia} />
                  ))}
                  {formData.media.length < 10 && (
                    <label className="aspect-square border-2 border-dashed border-muted-foreground/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 hover:border-primary/30 transition-all">
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple
                        onChange={handleMediaUpload} className="hidden" disabled={uploading} />
                      {uploading ? (
                        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-muted-foreground mb-1.5" />
                          <span className="text-[10px] text-muted-foreground text-center px-2">Add media</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* Availability – pill toggle */}
        <Section title="Availability">
          <div className="flex gap-2">
            {[
              { value: "available", label: "Available" },
              { value: "unavailable", label: "Unavailable" },
            ].map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => update("availabilityStatus", opt.value)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border
                  ${formData.availabilityStatus === opt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-foreground border-transparent hover:border-primary/30"
                  }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
      </form>

      {/* Sticky save button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t px-5 py-4 pb-safe">
        <div className="max-w-2xl mx-auto">
          <Button onClick={handleSubmit} className="w-full rounded-2xl h-12 font-semibold text-base" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : id ? (
              <span className="flex items-center gap-2">Update Listing <ChevronRight className="w-4 h-4" /></span>
            ) : (
              <span className="flex items-center gap-2">Create Listing <ChevronRight className="w-4 h-4" /></span>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-full h-screen p-0 gap-0">
          <DialogHeader className="absolute top-4 left-4 z-20">
            <DialogTitle className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold">
              Preview Mode
            </DialogTitle>
          </DialogHeader>
          {previewApartment && (
            <div className="h-full w-full">
              <ApartmentCard apartment={previewApartment} isActive={true} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingForm;
