// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
// Select,
// SelectContent,
// SelectItem,
// SelectTrigger,
// SelectValue,
// } from "@/components/ui/select";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import api from "@/lib/api";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useToast } from "@/hooks/use-toast";
// import {
// Table,
// TableBody,
// TableCell,
// TableHead,
// TableHeader,
// TableRow,
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
// Dialog,
// DialogContent,
// DialogHeader,
// DialogTitle,
// DialogFooter,
// } from "@/components/ui/dialog";
// import { Loader2, Plus } from "lucide-react";
// import { useState } from "react";

// interface FacultyUser {
// _id: string;
// name: string;
// email: string;
// assignedClubs: { _id: string; name: string }[];
// }

// interface Club {
// _id: string;
// name: string;
// }

// const FacultyAssignment = () => {
// const { toast } = useToast();
// const qc = useQueryClient();

// const [lastDeleted, setLastDeleted] = useState<any>(null);
// const [deleteOpen, setDeleteOpen] = useState(false);
// const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
// const [dialogOpen, setDialogOpen] = useState(false);
// const [newName, setNewName] = useState("");
// const [newEmail, setNewEmail] = useState("");
// const [newClubId, setNewClubId] = useState("none");

// const [search, setSearch] = useState("");
// const [filterClub, setFilterClub] = useState("all");
// const [page, setPage] = useState(1);
// const pageSize = 5;

// const { data: faculty, isLoading: facultyLoading } = useQuery<FacultyUser[]>({
// queryKey: ["faculty"],
// queryFn: async () => (await api.get("/admin/faculty")).data,
// });

// const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
// queryKey: ["clubs"],
// queryFn: async () => (await api.get("/clubs")).data,
// });

// const assignMutation = useMutation({
// mutationFn: ({ facultyId, clubId }: any) =>
// api.put(`/admin/faculty/${facultyId}/assign`, { clubId }),
// onSuccess: () => {
// qc.invalidateQueries({ queryKey: ["faculty"] });
// toast({ title: "Assigned successfully" });
// },
// });

// const deleteMutation = useMutation({
// mutationFn: (id: string) => api.delete(`/admin/faculty/${id}`),
// onSuccess: () => {
// qc.invalidateQueries({ queryKey: ["faculty"] });
// toast({ title: "Faculty deleted" });
// },
// });

// const createMutation = useMutation({
// mutationFn: (data: any) => api.post("/admin/assign-faculty", data),
// onSuccess: () => {
// qc.invalidateQueries({ queryKey: ["faculty"] });
// toast({ title: "Faculty created" });
// setDialogOpen(false);
// resetForm();
// },
// });

// const resetForm = () => {
// setNewName("");
// setNewEmail("");
// setNewClubId("none");
// };

// const handleCreate = (e: React.FormEvent) => {
// e.preventDefault();


// if (!newName.trim()) {
//   toast({ title: "Name required", variant: "destructive" });
//   return;
// }

// if (!newEmail.includes("@")) {
//   toast({ title: "Invalid email", variant: "destructive" });
//   return;
// }

// const exists = faculty?.some(
//   (f) => f.email.toLowerCase() === newEmail.toLowerCase()
// );

// if (exists) {
//   toast({ title: "Email already exists", variant: "destructive" });
//   return;
// }

// createMutation.mutate({
//   name: newName,
//   email: newEmail,
//   clubId: newClubId === "none" ? undefined : newClubId,
// });


// };

// const isLoading = facultyLoading || clubsLoading;

// const filteredFaculty = (faculty || []).filter((f) => {
// const matchSearch =
// f.name.toLowerCase().includes(search.toLowerCase()) ||
// f.email.toLowerCase().includes(search.toLowerCase());


// const matchClub =
//   filterClub === "all" ||
//   f.assignedClubs?.some((c) => c._id === filterClub);

// return matchSearch && matchClub;


// });

// const totalPages = Math.ceil(filteredFaculty.length / pageSize);

// const paginatedFaculty = filteredFaculty.slice(
// (page - 1) * pageSize,
// page * pageSize
// );

// return ( <div className="p-6 space-y-6">

//   <div className="flex justify-between items-center">
//     <div>
//       <h1 className="text-2xl font-semibold">Faculty Assignment</h1>
//       <p className="text-sm text-muted-foreground">
//         Assign faculty to clubs
//       </p>
//     </div>

//     <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
//       <Plus className="h-4 w-4 mr-1" />
//       Add Faculty
//     </Button>
//   </div>

//   <Card>
//     <CardHeader className="flex flex-row justify-between items-center">
//       <CardTitle>Faculty Members</CardTitle>
//       <span className="text-sm text-muted-foreground">
//         {filteredFaculty.length} total
//       </span>
//     </CardHeader>

//     <CardContent>

//       <div className="flex gap-3 mb-4">
//         <Input
//           placeholder="Search faculty..."
//           value={search}
//           onChange={(e) => {
//             setSearch(e.target.value);
//             setPage(1);
//           }}
//         />

//         <Select
//           value={filterClub}
//           onValueChange={(val) => {
//             setFilterClub(val);
//             setPage(1);
//           }}
//         >
//           <SelectTrigger className="w-[200px]">
//             <SelectValue placeholder="Filter by club" />
//           </SelectTrigger>

//           <SelectContent>
//             <SelectItem value="all">All Clubs</SelectItem>
//             {clubs?.map((club) => (
//               <SelectItem key={club._id} value={club._id}>
//                 {club.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>

//       {isLoading ? (
//         <Skeleton className="h-20" />
//       ) : filteredFaculty.length === 0 ? (
//         <div className="text-center py-10 text-muted-foreground">
//           No faculty found
//         </div>
//       ) : (
//         <>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Name</TableHead>
//                 <TableHead>Email</TableHead>
//                 <TableHead>Club</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>

//             <TableBody>
//               {paginatedFaculty.map((f) => (
//                 <TableRow key={f._id}>
//                   <TableCell>{f.name}</TableCell>
//                   <TableCell>{f.email}</TableCell>

//                   <TableCell>
//                     <Select
//                       value={
//                         f.assignedClubs?.length
//                           ? f.assignedClubs[0]._id
//                           : "none"
//                       }
//                       onValueChange={(val) =>
//                         assignMutation.mutate({
//                           facultyId: f._id,
//                           clubId: val === "none" ? undefined : val,
//                         })
//                       }
//                     >
//                       <SelectTrigger className="w-[200px]">
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="none">Unassigned</SelectItem>
//                         {clubs?.map((club) => (
//                           <SelectItem key={club._id} value={club._id}>
//                             {club.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </TableCell>

//                   <TableCell className="text-right">
//                     <Button
//   variant="destructive"
//   size="sm"
//   onClick={() => {
//     setSelectedFaculty(f._id);
//     setDeleteOpen(true);
//   }}
// >
//   Delete
// </Button>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>

//           <div className="flex justify-between items-center mt-4">
//             <span className="text-sm text-muted-foreground">
//               Page {page} of {totalPages || 1}
//             </span>

//             <div className="flex gap-2">
//               <Button
//                 size="sm"
//                 disabled={page === 1}
//                 onClick={() => setPage((p) => p - 1)}
//               >
//                 Prev
//               </Button>

//               <Button
//                 size="sm"
//                 disabled={page === totalPages}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 Next
//               </Button>
//             </div>
//           </div>
//         </>
//       )}
//     </CardContent>
//   </Card>

//   <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
//     <DialogContent>
//       <DialogHeader>
//         <DialogTitle>Create Faculty</DialogTitle>
//       </DialogHeader>

//       <form onSubmit={handleCreate} className="space-y-4">
//         <Input
//           placeholder="Name"
//           value={newName}
//           onChange={(e) => setNewName(e.target.value)}
//         />

//         <Input
//           type="email"
//           placeholder="Email"
//           value={newEmail}
//           onChange={(e) => setNewEmail(e.target.value)}
//         />

//         <Select value={newClubId} onValueChange={setNewClubId}>
//           <SelectTrigger>
//             <SelectValue placeholder="Select club" />
//           </SelectTrigger>

//           <SelectContent>
//             <SelectItem value="none">None</SelectItem>
//             {clubs?.map((club) => (
//               <SelectItem key={club._id} value={club._id}>
//                 {club.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         <DialogFooter>
//           <Button type="submit" disabled={createMutation.isPending}>
//             {createMutation.isPending && (
//               <Loader2 className="animate-spin mr-2" />
//             )}
//             Create
//           </Button>
//         </DialogFooter>
//       </form>
//     </DialogContent>
//   </Dialog>

//   <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
//   <DialogContent>
//     <DialogHeader>
//       <DialogTitle>Delete Faculty</DialogTitle>
//     </DialogHeader>

//     <p className="text-sm text-muted-foreground">
//       This action will permanently remove this faculty.
//     </p>

//     <DialogFooter>
//       <Button
//   variant="destructive"
//   disabled={deleteMutation.isPending}
//   onClick={() => {
//     if (!selectedFaculty) return;

//     const deletedItem = faculty?.find(
//       (f) => f._id === selectedFaculty
//     );

//     deleteMutation.mutate(selectedFaculty, {
//       onSuccess: () => {
//         setLastDeleted(deletedItem);

//         toast({
//           title: "Faculty deleted",
//           description: "Undo available for 5 seconds",
//           action: (
//             <button
//               onClick={async () => {
//                 if (!deletedItem) return;

//                 await api.post("/admin/assign-faculty", {
//                   name: deletedItem.name,
//                   email: deletedItem.email,
//                   clubId:
//                     deletedItem.assignedClubs?.[0]?._id,
//                 });

//                 qc.invalidateQueries({ queryKey: ["faculty"] });
//                 setLastDeleted(null);
//               }}
//               className="text-blue-500 underline"
//             >
//               Undo
//             </button>
//           ),
//         });

//         setTimeout(() => {
//           setLastDeleted(null);
//         }, 5000);
//       },
//     });

//     setDeleteOpen(false);
//     setSelectedFaculty(null);
//   }}
// >
//   {deleteMutation.isPending && (
//     <Loader2 className="animate-spin mr-2" />
//   )}
//   Confirm Delete
// </Button>
//     </DialogFooter>
//   </DialogContent>
// </Dialog>

// </div>


// );
// };

// export default FacultyAssignment;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

interface FacultyUser {
_id: string;
name: string;
email: string;
assignedClubs: { _id: string; name: string }[];
}

interface Club {
_id: string;
name: string;
}

const FacultyAssignment = () => {
const { toast } = useToast();
const qc = useQueryClient();

const [lastDeleted, setLastDeleted] = useState<any>(null);
const [deleteOpen, setDeleteOpen] = useState(false);
const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
const [dialogOpen, setDialogOpen] = useState(false);
const [newName, setNewName] = useState("");
const [newEmail, setNewEmail] = useState("");
const [newClubId, setNewClubId] = useState("none");

const [search, setSearch] = useState("");
const [filterClub, setFilterClub] = useState("all");
const [page, setPage] = useState(1);
const pageSize = 5;

const { data: faculty, isLoading: facultyLoading } = useQuery<FacultyUser[]>({
queryKey: ["faculty"],
queryFn: async () => (await api.get("/admin/faculty")).data,
});

const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
queryKey: ["clubs"],
queryFn: async () => (await api.get("/clubs")).data,
});

const assignMutation = useMutation({
mutationFn: ({ facultyId, clubId }: any) =>
api.put(`/admin/faculty/${facultyId}/assign`, { clubId }),
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["faculty"] });
toast({ title: "Assigned successfully" });
},
});

const deleteMutation = useMutation({
mutationFn: (id: string) => api.delete(`/admin/faculty/${id}`),
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["faculty"] });
toast({ title: "Faculty deleted" });
},
});

const createMutation = useMutation({
mutationFn: (data: any) => api.post("/admin/assign-faculty", data),
onSuccess: () => {
qc.invalidateQueries({ queryKey: ["faculty"] });
toast({ title: "Faculty created" });
setDialogOpen(false);
resetForm();
},
});

const resetForm = () => {
setNewName("");
setNewEmail("");
setNewClubId("none");
};

const handleCreate = (e: React.FormEvent) => {
e.preventDefault();


if (!newName.trim()) {
  toast({ title: "Name required", variant: "destructive" });
  return;
}

if (!newEmail.includes("@")) {
  toast({ title: "Invalid email", variant: "destructive" });
  return;
}

const exists = faculty?.some(
  (f) => f.email.toLowerCase() === newEmail.toLowerCase()
);

if (exists) {
  toast({ title: "Email already exists", variant: "destructive" });
  return;
}

createMutation.mutate({
  name: newName,
  email: newEmail,
  clubId: newClubId === "none" ? undefined : newClubId,
});


};

const isLoading = facultyLoading || clubsLoading;

const filteredFaculty = (faculty || []).filter((f) => {
const matchSearch =
f.name.toLowerCase().includes(search.toLowerCase()) ||
f.email.toLowerCase().includes(search.toLowerCase());


const matchClub =
  filterClub === "all" ||
  f.assignedClubs?.some((c) => c._id === filterClub);

return matchSearch && matchClub;


});

const totalPages = Math.ceil(filteredFaculty.length / pageSize);

const paginatedFaculty = filteredFaculty.slice(
(page - 1) * pageSize,
page * pageSize
);

return ( <div className="p-6 space-y-6">

  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-semibold">Faculty Assignment</h1>
      <p className="text-sm text-muted-foreground">
        Assign faculty to clubs
      </p>
    </div>

    <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
      <Plus className="h-4 w-4 mr-1" />
      Add Faculty
    </Button>
  </div>

  <Card>
    <CardHeader className="flex flex-row justify-between items-center">
      <CardTitle>Faculty Members</CardTitle>
      <span className="text-sm text-muted-foreground">
        {filteredFaculty.length} total
      </span>
    </CardHeader>

    <CardContent>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search faculty..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <Select
          value={filterClub}
          onValueChange={(val) => {
            setFilterClub(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by club" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {clubs?.map((club) => (
              <SelectItem key={club._id} value={club._id}>
                {club.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-20" />
      ) : filteredFaculty.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          No faculty found
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Club</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedFaculty.map((f) => (
                <TableRow key={f._id}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.email}</TableCell>

                  <TableCell>
                    <Select
                      value={
                        f.assignedClubs?.length
                          ? f.assignedClubs[0]._id
                          : "none"
                      }
                      onValueChange={(val) =>
                        assignMutation.mutate({
                          facultyId: f._id,
                          clubId: val === "none" ? undefined : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {clubs?.map((club) => (
                          <SelectItem key={club._id} value={club._id}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
  variant="destructive"
  size="sm"
  onClick={() => {
    setSelectedFaculty(f._id);
    setDeleteOpen(true);
  }}
>
  Delete
</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1}
            </span>

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>

              <Button
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>

  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Faculty</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleCreate} className="space-y-4">
        <Input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <Input
          type="email"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />

        <Select value={newClubId} onValueChange={setNewClubId}>
          <SelectTrigger>
            <SelectValue placeholder="Select club" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {clubs?.map((club) => (
              <SelectItem key={club._id} value={club._id}>
                {club.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="animate-spin mr-2" />
            )}
            Create
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Faculty</DialogTitle>
    </DialogHeader>

    <p className="text-sm text-muted-foreground">
      This action will permanently remove this faculty.
    </p>

    <DialogFooter>
      <Button
  variant="destructive"
  disabled={deleteMutation.isPending}
  onClick={() => {
    if (!selectedFaculty) return;

    const deletedItem = faculty?.find(
      (f) => f._id === selectedFaculty
    );

    deleteMutation.mutate(selectedFaculty, {
      onSuccess: () => {
        setLastDeleted(deletedItem);

        toast({
          title: "Faculty deleted",
          description: "Undo available for 5 seconds",
          action: (
            <button
              onClick={async () => {
                if (!deletedItem) return;

                await api.post("/admin/assign-faculty", {
                  name: deletedItem.name,
                  email: deletedItem.email,
                  clubId:
                    deletedItem.assignedClubs?.[0]?._id,
                });

                qc.invalidateQueries({ queryKey: ["faculty"] });
                setLastDeleted(null);
              }}
              className="text-blue-500 underline"
            >
              Undo
            </button>
          ),
        });

        setTimeout(() => {
          setLastDeleted(null);
        }, 5000);
      },
    });

    setDeleteOpen(false);
    setSelectedFaculty(null);
  }}
>
  {deleteMutation.isPending && (
    <Loader2 className="animate-spin mr-2" />
  )}
  Confirm Delete
</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

</div>


);
};

export default FacultyAssignment;
