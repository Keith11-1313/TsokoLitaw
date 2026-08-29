"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarDays, Clock, LockKeyhole, MapPin, Pencil, Plus, X } from "lucide-react";
import {
  savePickupLocationAction, savePickupScheduleAction, savePickupSettingsAction,
  setPickupDateOpenAction, type PickupActionState,
} from "@/app/admin/pickup/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type {
  AdminPickupDate, AdminPickupLocation, AdminPickupSettings, PickupMode,
} from "@/lib/server-pickup";

const initialState: PickupActionState = { status: "idle", message: "" };
const modeLabels: Record<PickupMode, string> = {
  MADE_TO_ORDER: "Made to order", READY_STOCK: "Ready stock", HYBRID: "Hybrid",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short", year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function ActionMessage({ state }: { state: PickupActionState }) {
  if (state.status === "idle") return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`rounded-control p-3 text-sm font-bold ${state.status === "error" ? "bg-danger-background text-danger-foreground" : "bg-success-background text-success-foreground"}`}>{state.message}</p>;
}

interface WindowDraft {
  key: string;
  startTime: string;
  endTime: string;
  capacity: number;
  locationIds: string[];
}

function ScheduleEditor({
  date, locations, defaultCapacity, onClose,
}: {
  date: AdminPickupDate | null;
  locations: AdminPickupLocation[];
  defaultCapacity: number;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(savePickupScheduleAction, initialState);
  const activeLocationIds = new Set(locations.map((location) => location.id));
  const [windows, setWindows] = useState<WindowDraft[]>(() => date?.windows.map((window) => ({
    key: window.id, startTime: window.startTime, endTime: window.endTime,
    capacity: window.capacity, locationIds: window.locationIds.filter((id) => activeLocationIds.has(id)),
  })) ?? [{ key: "window-0", startTime: "07:00", endTime: "08:00", capacity: defaultCapacity, locationIds: locations.map((location) => location.id) }]);

  function changeWindow(key: string, patch: Partial<WindowDraft>) {
    setWindows((current) => current.map((window) => window.key === key ? { ...window, ...patch } : window));
  }

  function toggleLocation(key: string, locationId: string) {
    setWindows((current) => current.map((window) => {
      if (window.key !== key) return window;
      return { ...window, locationIds: window.locationIds.includes(locationId)
        ? window.locationIds.filter((id) => id !== locationId)
        : [...window.locationIds, locationId] };
    }));
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" onPointerDown={() => !pending && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="pickup-editor-title" onPointerDown={(event) => event.stopPropagation()} className="my-auto w-full max-w-3xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Pickup schedule</p><h2 id="pickup-editor-title" className="mt-1 font-display text-3xl">{date ? "Edit pickup date" : "Add pickup date"}</h2></div>
        <button type="button" aria-label="Close pickup editor" disabled={pending} onClick={onClose} className="flex size-11 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" /></button>
      </div>
      <form action={action} className="mt-6 space-y-6">
        <input type="hidden" name="pickupDateId" value={date?.id ?? ""} />
        <input type="hidden" name="windows" value={JSON.stringify(windows.map(({ startTime, endTime, capacity, locationIds }) => ({ startTime, endTime, capacity, locationIds })))} />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="pickup-date" label="Pickup date" required inputProps={{ name: "pickupDate", type: "date", defaultValue: date?.pickupDate }} />
          <FormField id="pickup-mode" label="Availability mode" required as="select" selectProps={{ name: "availabilityMode", defaultValue: date?.availabilityMode ?? "MADE_TO_ORDER" }}>
            <option value="MADE_TO_ORDER">Made to order</option><option value="READY_STOCK">Ready stock</option><option value="HYBRID">Hybrid</option>
          </FormField>
          <FormField id="pickup-notes" label="Internal note (optional)" className="sm:col-span-2" inputProps={{ name: "notes", maxLength: 500, defaultValue: date?.notes }} />
          <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold sm:col-span-2"><input type="checkbox" name="isOpen" defaultChecked={date?.isOpen ?? true} className="size-4 accent-brand" />Publish this date at checkout</label>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4"><div><h3 className="font-display text-2xl">Time windows</h3><p className="mt-1 text-xs text-muted-foreground">Each window needs a capacity and at least one location.</p></div><SecondaryButton onClick={() => setWindows((current) => [...current, { key: crypto.randomUUID(), startTime: "07:00", endTime: "08:00", capacity: defaultCapacity, locationIds: locations.map((location) => location.id) }])}><Plus size={16} />Add window</SecondaryButton></div>
          <div className="mt-4 space-y-4">
            {windows.map((window, index) => <fieldset key={window.key} className="rounded-card border border-border bg-surface-muted p-4">
              <legend className="px-2 text-sm font-bold">Window {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField id={`start-${window.key}`} label="Start" required inputProps={{ type: "time", value: window.startTime, onChange: (event) => changeWindow(window.key, { startTime: event.target.value }) }} />
                <FormField id={`end-${window.key}`} label="End" required inputProps={{ type: "time", value: window.endTime, onChange: (event) => changeWindow(window.key, { endTime: event.target.value }) }} />
                <FormField id={`capacity-${window.key}`} label="Capacity (boxes)" required inputProps={{ type: "number", min: 1, max: 1000, value: window.capacity, onChange: (event) => changeWindow(window.key, { capacity: Number(event.target.value) }) }} />
              </div>
              <div className="mt-4"><p className="text-sm font-bold">Locations</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{locations.map((location) => <label key={location.id} className="flex min-h-11 items-center gap-3 rounded-control bg-surface px-3 text-sm"><input type="checkbox" checked={window.locationIds.includes(location.id)} onChange={() => toggleLocation(window.key, location.id)} className="size-4 accent-brand" />{location.name}</label>)}</div></div>
              {windows.length > 1 ? <button type="button" onClick={() => setWindows((current) => current.filter((item) => item.key !== window.key))} className="mt-4 min-h-11 text-sm font-bold text-danger-foreground">Remove window</button> : null}
            </fieldset>)}
          </div>
        </div>
        <ActionMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-2"><SecondaryButton disabled={pending} onClick={onClose}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : date ? "Save schedule" : "Publish pickup date"}</PrimaryButton></div>
      </form>
    </section>
  </div>;
}

function PickupRules({ settings }: { settings: AdminPickupSettings }) {
  const [state, action, pending] = useActionState(savePickupSettingsAction, initialState);
  return <form action={action} className="rounded-card border border-border bg-surface p-6">
    <h2 className="font-display text-2xl">Pickup rules</h2>
    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <FormField id="lead-days" label="Made-to-order lead days" required inputProps={{ name: "minimumLeadDays", type: "number", min: 0, max: 30, defaultValue: settings.minimumLeadDays }} />
      <FormField id="cutoff-time" label="Daily order cutoff" required inputProps={{ name: "dailyCutoffTime", type: "time", defaultValue: settings.dailyCutoffTime }} />
      <FormField id="grace-minutes" label="Pickup grace (minutes)" required inputProps={{ name: "graceMinutes", type: "number", min: 0, max: 120, defaultValue: settings.graceMinutes }} />
      <FormField id="default-capacity" label="Default window capacity" required inputProps={{ name: "defaultCapacity", type: "number", min: 1, max: 1000, defaultValue: settings.defaultCapacity }} />
      <FormField id="operating-start" label="Operating start" required inputProps={{ name: "operatingStart", type: "time", defaultValue: settings.operatingStart }} />
      <FormField id="operating-end" label="Operating end" required inputProps={{ name: "operatingEnd", type: "time", defaultValue: settings.operatingEnd }} />
    </div>
    <div className="mt-5 space-y-3"><ActionMessage state={state} /><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save pickup rules"}</PrimaryButton></div>
  </form>;
}

function LocationEditor({ location, onClose }: {
  location: AdminPickupLocation | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(savePickupLocationAction, initialState);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4" onPointerDown={() => !pending && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="location-editor-title" onPointerDown={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-card border border-border bg-surface p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Campus location</p><h2 id="location-editor-title" className="mt-1 font-display text-3xl">{location ? "Edit pickup location" : "Add pickup location"}</h2></div>
        <button type="button" aria-label="Close location editor" disabled={pending} onClick={onClose} className="flex size-11 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus"><X aria-hidden="true" /></button>
      </div>
      <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="locationId" value={location?.id ?? ""} />
        <FormField id="location-name" label="Location name" required inputProps={{ name: "name", minLength: 2, maxLength: 100, defaultValue: location?.name }} />
        <FormField id="location-description" label="Customer directions (optional)" inputProps={{ name: "description", maxLength: 300, defaultValue: location?.description }} />
        <label className="flex min-h-11 items-center gap-3 rounded-control bg-surface-control px-4 py-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={location?.isActive ?? true} className="size-4 accent-brand" />Available for new pickup schedules</label>
        <ActionMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-2"><SecondaryButton disabled={pending} onClick={onClose}>Cancel</SecondaryButton><PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save location"}</PrimaryButton></div>
      </form>
    </section>
  </div>;
}

function PickupDateCard({ date, locations, onEdit }: { date: AdminPickupDate; locations: AdminPickupLocation[]; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<PickupActionState>(initialState);
  const locationNames = new Map(locations.map((location) => [location.id, location.name]));
  return <article className="rounded-card border border-border bg-surface p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl">{formatDate(date.pickupDate)}</h3><span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-bold text-brand">{modeLabels[date.availabilityMode]}</span><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${date.isOpen ? "bg-success-background text-success-foreground" : "bg-surface-muted text-muted-foreground"}`}>{date.isOpen ? "Published" : "Closed"}</span></div>{date.notes ? <p className="mt-2 text-sm text-muted-foreground">{date.notes}</p> : null}</div>
      {date.isLocked ? <span className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground"><LockKeyhole size={15} />Schedule locked by orders or inventory</span> : null}
    </div>
    <div className="mt-5 space-y-3">{date.windows.map((window) => <div key={window.id} className="grid gap-2 rounded-control bg-surface-muted p-4 text-sm md:grid-cols-[1fr_1fr_auto]">
      <span className="flex items-center gap-2"><Clock size={16} className="text-brand" />{formatTime(window.startTime)}–{formatTime(window.endTime)}</span>
      <span className="flex items-center gap-2"><MapPin size={16} className="text-brand" />{window.locationIds.map((id) => locationNames.get(id)).filter(Boolean).join(" · ")}</span>
      <span className="font-bold">{window.bookedBoxes} / {window.capacity} boxes</span>
    </div>)}</div>
    <div className="mt-5 flex flex-wrap gap-3">
      <SecondaryButton disabled={date.isLocked || pending} onClick={onEdit}><Pencil size={16} />Edit schedule</SecondaryButton>
      <SecondaryButton disabled={pending} onClick={() => startTransition(async () => setMessage(await setPickupDateOpenAction({ pickupDateId: date.id, isOpen: !date.isOpen })))}>{pending ? "Saving…" : date.isOpen ? "Close date" : "Publish date"}</SecondaryButton>
    </div>
    <div className="mt-3"><ActionMessage state={message} /></div>
  </article>;
}

export function PickupManager({ dates, locations, settings }: { dates: AdminPickupDate[]; locations: AdminPickupLocation[]; settings: AdminPickupSettings }) {
  const [editor, setEditor] = useState<AdminPickupDate | null | undefined>();
  const [locationEditor, setLocationEditor] = useState<AdminPickupLocation | null | undefined>();
  const activeLocations = locations.filter((location) => location.isActive);
  return <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-2xl">Upcoming pickup dates</h2><p className="mt-1 text-sm text-muted-foreground">Create the schedule here; Ready Stock and Hybrid dates will then appear in Inventory.</p></div><PrimaryButton onClick={() => setEditor(null)}><Plus size={17} />Add pickup date</PrimaryButton></div>
    <div className="mt-5 space-y-4">{dates.length ? dates.map((date) => <PickupDateCard key={date.id} date={date} locations={locations} onEdit={() => setEditor(date)} />) : <div className="rounded-card border border-border bg-surface p-10 text-center"><CalendarDays className="mx-auto text-brand" size={34} /><h3 className="mt-4 font-display text-2xl">No upcoming pickup dates</h3><p className="mt-2 text-sm text-muted-foreground">Add a date before customers can choose a campus pickup.</p></div>}</div>
    <div className="mt-8"><PickupRules settings={settings} /></div>
    <section className="mt-8 rounded-card border border-border bg-surface p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-2xl">Campus locations</h2><p className="mt-1 text-sm text-muted-foreground">Inactive locations remain on historical orders but cannot be assigned to new schedules.</p></div><SecondaryButton onClick={() => setLocationEditor(null)}><Plus size={16} />Add location</SecondaryButton></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{locations.map((location) => <article key={location.id} className="rounded-control bg-surface-muted p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{location.name}</h3><span className={`rounded-lg px-2 py-1 text-xs font-bold ${location.isActive ? "bg-success-background text-success-foreground" : "bg-surface text-muted-foreground"}`}>{location.isActive ? "Active" : "Inactive"}</span></div>{location.description ? <p className="mt-1 text-sm text-muted-foreground">{location.description}</p> : null}</div><button type="button" aria-label={`Edit ${location.name}`} onClick={() => setLocationEditor(location)} className="flex size-11 shrink-0 items-center justify-center text-brand focus-visible:ring-2 focus-visible:ring-focus"><Pencil size={17} aria-hidden="true" /></button></div></article>)}</div></section>
    {editor !== undefined ? <ScheduleEditor key={editor?.id ?? "new"} date={editor} locations={activeLocations} defaultCapacity={settings.defaultCapacity} onClose={() => setEditor(undefined)} /> : null}
    {locationEditor !== undefined ? <LocationEditor key={locationEditor?.id ?? "new-location"} location={locationEditor} onClose={() => setLocationEditor(undefined)} /> : null}
  </>;
}
