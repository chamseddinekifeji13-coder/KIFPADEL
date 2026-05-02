import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Award, Plus, Trash2, Edit2 } from "lucide-react";
import Image from "next/image";

export default function AdminSponsorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionTitle 
          title="Gestion des Sponsors" 
          subtitle="Gérez les partenaires affichés sur la plateforme."
        />
        <button className="h-11 px-6 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors">
          <Plus className="h-4 w-4" />
          Nouveau Sponsor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SponsorCard name="Ooredoo" status="Actif" logo="/sponsors/ooredoo.png" />
        <SponsorCard name="Biars" status="Actif" logo="/sponsors/biars.png" />
        <SponsorCard name="Sabrine" status="Actif" logo="/sponsors/sabrine.png" />
      </div>
    </div>
  );
}

function SponsorCard({ name, status, logo }: { name: string, status: string, logo: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-slate-100 flex items-center justify-center p-8">
        <div className="w-full h-full relative flex items-center justify-center text-slate-300">
          <Award className="h-12 w-12" />
          <span className="absolute bottom-0 text-[10px] font-bold uppercase tracking-widest">{name}</span>
        </div>
      </div>
      <div className="p-4 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-900">{name}</h4>
          <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{status}</span>
        </div>
        <div className="flex gap-2">
          <button className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 hover:bg-rose-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
