import { useEffect, useState } from "react";
import api from "@/api/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Trash2 } from "lucide-react";


const MediaDocuments = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await api.get("/events/admin/media");
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

 const handleDelete = async (eventId: string, fileId: string) => {
  try {
    console.log("EVENT ID:", eventId);
    console.log("FILE ID:", fileId);

    const res = await api.delete(
      `/events/${eventId}/file/${fileId}`
    );

    console.log("DELETE SUCCESS:", res.data);

    setData((prev: any[]) =>
      prev.map((event) => ({
        ...event,
        attachments: event.attachments.filter(
          (f: any) => f._id !== fileId
        ),
      }))
    );
  } catch (err: any) {
    console.error("DELETE ERROR:", err.response?.data);
    console.error(err);
  }
};

  

  const getIcon = (name: string) => {
    if (!name) return "📄";
    const n = name.toLowerCase();

    if (n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg")) return "🖼️";
    if (n.endsWith(".pdf")) return "📕";
    if (n.endsWith(".doc") || n.endsWith(".docx")) return "📘";

    return "📄";
  };

  const isPreviewable = (name: string) => {
    const n = name.toLowerCase();
    return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".pdf");
  };

 const filteredData = data
  .map((event: any) => {
    const files = event.attachments
      ?.filter((f: any) => !f.isDeleted) // IMPORTANT
      ?.filter((f: any) =>
        f.originalName.toLowerCase().includes(search.toLowerCase())
      );

    return { ...event, attachments: files };
  })
  .filter((e: any) => e.attachments.length > 0);


  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
<h1 className="text-3xl font-bold tracking-tight"></h1>
          <p className="text-sm text-muted-foreground">
            Manage all uploaded files
          </p>
        </div>

        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-64"
        />
      </div>

      {/* EMPTY */}
      {filteredData.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          No files found
        </div>
      )}

      {/* EVENTS */}
      {filteredData.map((event: any) => (
<Card
  key={event._id}
  className="shadow-sm hover:shadow-md transition-shadow"
>
<CardContent className="p-5 space-y-4">

            {/* EVENT HEADER */}
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{event.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {event.clubId?.name} • {event.date}
                </p>
              </div>

              <span className="text-xs bg-muted px-2 py-1 rounded">
                {event.attachments.length} files
              </span>
            </div>
            {/* 🔥 BROCHURE SECTION */}
{event.attachments.some((f: any) => f.label === "brochure") && (
  <div className="mb-3 p-3 border rounded bg-blue-50">

    <p className="text-sm font-semibold text-blue-600 mb-2">
      Brochure
    </p>

    {event.attachments
      .filter((f: any) => f.label === "brochure")
      .map((file: any) => (
        <div key={file._id} className="flex justify-between items-center">

          <span className="text-sm">{file.originalName}</span>

          <a
            href={`http://localhost:5000${file.url}`}
            target="_blank"
            className="text-blue-500 underline text-sm"
          >
            View
          </a>

        </div>
      ))}
  </div>
)}

            {/* FILES */}
            <div className="space-y-2">
              {event.attachments.map((file: any) => (
                <div
                  key={file._id}
className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
>
                <div className="flex flex-col gap-1 w-[60%]">

  <div className="flex items-center gap-3">
    <span>{getIcon(file.originalName)}</span>

    <span className="truncate text-sm">
      {file.originalName}
    </span>

    {/* 🔥 ADD THIS */}
    {file.label === "brochure" && (
      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
        Brochure
      </span>
    )}
  </div>

  <span className="text-xs text-gray-400">
    Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}
  </span>

</div>

                  <div className="flex items-center gap-3 text-sm">

                    {/* PREVIEW */}
                    {isPreviewable(file.originalName) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPreview(`http://localhost:5000${file.url}`)
                        }
                      >
                        Preview
                      </Button>
                    )}

                    {/* OPEN */}
                    <a
                      href={`http://localhost:5000${file.url}`}
                      target="_blank"
                      className="text-blue-500"
                    >
                      Open
                    </a>

                    {/* DELETE */}
                 <AlertDialog>
  <AlertDialogTrigger asChild>
    <Button
      size="sm"
      variant="destructive"
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Delete
    </Button>
  </AlertDialogTrigger>

  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        Move file to Trash?
      </AlertDialogTitle>

      <AlertDialogDescription>
        <div className="mt-3 border rounded-md p-3 bg-muted">
          <p className="font-medium">
            {file.originalName}
          </p>
        </div>

        <p className="mt-4">
          This file will be removed from Media Documents
          and moved to Trash. You can restore it later.
        </p>
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel>
        Cancel
      </AlertDialogCancel>

      <AlertDialogAction
        className="bg-red-600 hover:bg-red-700"
        onClick={() =>
          handleDelete(event._id, file._id)
        }
      >
        Move to Trash
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      ))}

      {/* PREVIEW MODAL */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview?.endsWith(".pdf") ? (
            <iframe src={preview} className="w-full h-[500px]" />
          ) : (
            <img src={preview} className="w-full rounded" />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MediaDocuments;