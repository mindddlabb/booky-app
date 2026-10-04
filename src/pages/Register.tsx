import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    userType: "user" as "user" | "lister",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = registerSchema.safeParse({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      phone: formData.phone,
    });
    
    if (!validation.success) {
      validation.error.errors.forEach((err) => {
        toast.error(err.message);
      });
      return;
    }

    setLoading(true);

    try {
      let profilePictureUrl = "";

      // Upload profile picture if provided
      if (profilePicture) {
        const fileExt = profilePicture.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, profilePicture);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("profile-pictures")
          .getPublicUrl(fileName);

        profilePictureUrl = urlData.publicUrl;
      }

      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim(),
            user_type: formData.userType,
            profile_picture: profilePictureUrl,
          },
          emailRedirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Account created successfully!");
        navigate("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="self-start mb-6 min-h-[44px] -ml-2"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </Button>

      <div className="max-w-md w-full mx-auto space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">Create account</h1>
          <p className="text-muted-foreground">Join the Booky community</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Profile Picture */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="John Doe"
              className="h-12 rounded-xl"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="you@example.com"
              className="h-12 rounded-xl"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 (555) 000-0000"
              className="h-12 rounded-xl"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-12 rounded-xl"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-3">
            <Label>I am a</Label>
            <RadioGroup
              value={formData.userType}
              onValueChange={(value: "user" | "lister") =>
                setFormData({ ...formData, userType: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="font-normal">
                  User (Looking for a place)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lister" id="lister" />
                <Label htmlFor="lister" className="font-normal">
                  Lister (Renting out a place)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary hover:underline font-medium"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
