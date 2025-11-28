const { prisma } = require("../config/db");
const { createClient } = require("@supabase/supabase-js");

module.exports = {
  getBookingDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await prisma.booking_Vaccine.findUnique({
        where: {
          id: id,
        },
        include: {
          user: true,
          lab: true,
          vaccine: true,
        },
      });
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.status(200).json({
        message: "Success",
        data: booking,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  createBooking: async (req, res) => {
    try {
      // 1. Extract user_id dari JWT token
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userId = req.user.userId;

      if (!userId) {
        return res.status(404).json({ message: "User not found" });
      }

      // 3. Handle file upload (HANYA via Supabase, tanpa fallback lokal)
      let recommendationUrl = null;
      console.log("Checking req.file:", req.file ? "File exists" : "No file");
      if (req.file) {
        console.log("File details:", req.file.originalname, req.file.mimetype, req.file.size);

        // Validasi: Pastikan Supabase env vars ada (wajib untuk Vercel)
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "risa-documents";
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          console.error("Supabase env vars missing - upload failed");
          return res.status(500).json({ message: "File upload service unavailable. Please try again later." });
        }

        // Inisialisasi Supabase
        let supabase;
        try {
          supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
          console.log("Supabase client initialized");
        } catch (err) {
          console.error("Failed to init Supabase:", err.message);
          return res.status(500).json({ message: "File upload service error. Please try again later." });
        }

        //Upload ke Supabase
        if (req.file.buffer) {
          const filename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, "_")}`;
          try {
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from(SUPABASE_BUCKET)
              .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
              });
            if (uploadErr) {
  console.error("Supabase upload error details:", JSON.stringify(uploadErr, null, 2));
              return res.status(500).json({ message: "Failed to upload file. Please try again." });
            } else {
              const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename);
              recommendationUrl = urlData?.publicUrl || null;
              console.log("Upload success, URL:", recommendationUrl);
            }
          } catch (err) {
            console.error("Upload exception:", err.message);
            return res.status(500).json({ message: "File upload failed. Please try again." });
          }
        } else {
          console.warn("No file buffer");
        }
      } else {
        console.log("No file uploaded");
      }

      // Jika masih null, gunakan req.body.recommendationUrl jika ada (untuk URL manual)
      if (!recommendationUrl) {
        recommendationUrl = req.body.recommendationUrl || null;
        console.log("Using manual URL:", recommendationUrl);
      }

      // 4. Extract data dari req.body
      const {
        id,
        nik,
        user_name,
        age,
        gender,
        lab_name,
        vaccine_name,
        date_time,
      } = req.body;
      const bookingId =
        id || `BKG${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const parent_email = req.body.parent_email || null;
      const parent_phone = req.body.parent_phone || null;
      // 5. Resolve lab_name → lab_id
      const lab = await prisma.labs.findFirst({
        where: { name: { contains: lab_name, mode: "insensitive" } },
      });
      if (!lab) {
        return res.status(404).json({ message: "Lab not found" });
      }
      // 6. Resolve vaccine_name → vaccine_id
      const vaccine = await prisma.vaccine_Types.findFirst({
        where: { name: { contains: vaccine_name, mode: "insensitive" } },
      });
      if (!vaccine) {
        return res.status(404).json({ message: "Vaccine not found" });
      }
      // 7. Create booking
      const newBooking = await prisma.booking_Vaccine.create({
        data: {
          id: bookingId,
          user_id: userId,
          user_name: user_name,
          nik,
          age: parseInt(age),
          gender,
          parent_email: parent_email,
          parent_phone: parent_phone,
          doctor_recommendation_url: recommendationUrl,
          lab_id: lab.id,
          vaccine_id: vaccine.id,
          date_time: date_time,
        },
        include: {
          lab: true,
          vaccine: true,
        },
      });
      res.status(201).json({
        message: "Booking created successfully",
        data: newBooking,
      });
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
};
