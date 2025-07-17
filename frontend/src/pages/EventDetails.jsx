import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hook/useAuth";
import "./EventDetails.css";
import { FaArrowLeft } from "react-icons/fa";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStudent } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userResponse, setUserResponse] = useState("");

  // Fetch event details from JSON Server
  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event data
      const eventResponse = await fetch(`http://localhost:3001/events/${id}`);
      if (!eventResponse.ok) {
        throw new Error(`Event not found`);
      }
      const eventData = await eventResponse.json();

      // Fetch club data for additional information
      const clubResponse = await fetch(
        `http://localhost:3001/clubs/${eventData.club_id}`
      );
      const clubData = await clubResponse.json();

      // Transform the data to match expected format
      const transformedEvent = {
        id: eventData.id,
        title: eventData.title,
        name: eventData.title,
        description: eventData.description,
        date: new Date(eventData.event_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: eventData.event_time,
        location: eventData.venue,
        venue: eventData.venue,
        club: clubData.name || "Unknown Club",
        category: clubData.category || "General",
        eventType: eventData.event_type,
        attendees: eventData.attendees_count || 0,
        status: eventData.status,
        needsVolunteers: eventData.needs_volunteers,
        maxVolunteers: eventData.max_volunteers,
        rsvpLimit: eventData.rsvp_limit,
        registrationFee: eventData.registration_fee,
        contactEmail: eventData.contact_email,
        durationHours: eventData.duration_hours,
        posterUrl: eventData.poster_url,
        tags: eventData.tags || [
          clubData.category,
          eventData.event_type,
          clubData.name,
        ],
        createdBy: eventData.created_by,
        clubId: eventData.club_id,
        targetBatchYear: eventData.target_batch_year,
      };

      setEvent(transformedEvent);
    } catch (err) {
      console.error("Error fetching event details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's response to this event
  const fetchUserResponse = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `http://localhost:3001/event_attendance?event_id=${id}&user_id=${user.id}`
      );
      const data = await response.json();

      if (data.length > 0) {
        setUserResponse(data[0].status);
      }
    } catch (err) {
      console.error("Error fetching user response:", err);
    }
  };

  // Handle user response (RSVP)
  const updateStatus = async (status) => {
    if (!user?.id) return;

    try {
      const attendanceData = {
        event_id: parseInt(id),
        user_id: user.id,
        status: status.toLowerCase().replace(" ", "_"),
        updated_at: new Date().toISOString(),
      };

      // Check if user already has a response for this event
      const existingResponse = await fetch(
        `http://localhost:3001/event_attendance?event_id=${id}&user_id=${user.id}`
      );
      const existingData = await existingResponse.json();

      if (existingData.length > 0) {
        // Update existing record
        await fetch(
          `http://localhost:3001/event_attendance/${existingData[0].id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attendanceData),
          }
        );
      } else {
        // Create new record
        await fetch("http://localhost:3001/event_attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attendanceData),
        });
      }

      // Update local state
      setUserResponse(attendanceData.status);

      // Update attendees count if going
      if (status === "Going") {
        const updatedCount = event.attendees + 1;

        await fetch(`http://localhost:3001/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendees_count: updatedCount }),
        });

        setEvent((prev) => ({ ...prev, attendees: updatedCount }));
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Handle volunteer registration
  const handleVolunteerResponse = async () => {
    if (!user?.id) return;

    try {
      await fetch("http://localhost:3001/event_volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: parseInt(id),
          user_id: user.id,
          status: "pending",
          created_at: new Date().toISOString(),
        }),
      });

      setUserResponse("volunteer");
    } catch (err) {
      console.error("Error handling volunteer response:", err);
    }
  };

  // Helper function to get category emoji
  const getCategoryEmoji = (category) => {
    const emojiMap = {
      Sports: "🏀",
      Tech: "💻",
      "Arts (Drama)": "🎭",
      "Arts (Music)": "🎵",
      "Arts (Dance)": "💃",
      Photography: "📸",
      "E-Cell": "💼",
      "Dev Club": "⚡",
      "Content Creation": "📝",
      "Debate Society": "🗣️",
      "Cultural Committee": "🎪",
    };
    return emojiMap[category] || "📅";
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    if (user?.id) {
      fetchUserResponse();
    }
  }, [user?.id, id]);

  if (loading) return <div className="loading">Loading event details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!event) return <div className="error">Event not found</div>;

  return (
    <div className="event-details-container">
      <div className="event-details-header-section">
        <button
          className="event-details-back-button"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          Back
        </button>
      </div>

      <div className="event-details-content-wrapper">
        {/* Event Image/Banner */}
        <div className="event-details-banner">
          {event.posterUrl ? (
            <img
              src={event.posterUrl}
              alt={event.title}
              className="event-details-image"
            />
          ) : (
            <div className="event-details-placeholder-banner">
              <div className="event-details-placeholder-emoji">
                {getCategoryEmoji(event.category)}
              </div>
              <h1>{event.title}</h1>
            </div>
          )}
          {event.status === "past" && (
            <div className="event-details-status-overlay">Past Event</div>
          )}
        </div>

        {/* Event Title and Category */}
        <div className="event-details-header-info">
          <h1 className="event-details-title">{event.title}</h1>
          <span
            className={`event-details-category-badge ${event.category
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[()]/g, "")}`}
          >
            {event.category}
          </span>
        </div>

        {/* Event Description */}
        <div className="event-details-section">
          <h3>Description</h3>
          <p className="event-details-description">{event.description}</p>
        </div>

        {/* Event Information */}
        <div className="event-details-section">
          <h3>Event Information</h3>
          <div className="event-details-info-grid">
            <div className="event-details-info-item">
              <span className="event-details-info-icon">📅</span>
              <div>
                <strong>Date:</strong> {event.date}
              </div>
            </div>
            <div className="event-details-info-item">
              <span className="event-details-info-icon">⏰</span>
              <div>
                <strong>Time:</strong> {event.time}
              </div>
            </div>
            <div className="event-details-info-item">
              <span className="event-details-info-icon">📍</span>
              <div>
                <strong>Location:</strong> {event.location}
              </div>
            </div>
            <div className="event-details-info-item">
              <span className="event-details-info-icon">🏛️</span>
              <div>
                <strong>Organized by:</strong> {event.club}
              </div>
            </div>
            <div className="event-details-info-item">
              <span className="event-details-info-icon">👥</span>
              <div>
                <strong>Attendees:</strong> {event.attendees} interested
              </div>
            </div>
            {event.registrationFee > 0 && (
              <div className="event-details-info-item">
                <span className="event-details-info-icon">💰</span>
                <div>
                  <strong>Registration Fee:</strong> ₹{event.registrationFee}
                </div>
              </div>
            )}
            {event.durationHours && (
              <div className="event-details-info-item">
                <span className="event-details-info-icon">⏱️</span>
                <div>
                  <strong>Duration:</strong> {event.durationHours} hours
                </div>
              </div>
            )}
            {event.contactEmail && (
              <div className="event-details-info-item">
                <span className="event-details-info-icon">📧</span>
                <div>
                  <strong>Contact:</strong> {event.contactEmail}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="event-details-section">
          <h3>Tags</h3>
          <div className="event-details-tags-container">
            {event.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* RSVP Section - Only show for students */}
        {isStudent() && (
          <div className="event-details-section">
            <h3>RSVP</h3>
            <div className="event-details-rsvp-buttons">
              <button
                onClick={() => updateStatus("Going")}
                className={`event-details-rsvp-btn going ${
                  userResponse === "going" ? "selected" : ""
                }`}
              >
                ✔ Going
              </button>
              <button
                onClick={() => updateStatus("Not Going")}
                className={`event-details-rsvp-btn not-going ${
                  userResponse === "not_going" ? "selected" : ""
                }`}
              >
                ✖ Not Going
              </button>
              <button
                onClick={() => updateStatus("Maybe")}
                className={`event-details-rsvp-btn maybe ${
                  userResponse === "maybe" ? "selected" : ""
                }`}
              >
                🤔 Maybe
              </button>
              {event.needsVolunteers && (
                <button
                  onClick={handleVolunteerResponse}
                  className={`event-details-rsvp-btn volunteer ${
                    userResponse === "volunteer" ? "selected" : ""
                  }`}
                >
                  🙋‍♂️ Volunteer
                </button>
              )}
            </div>
            {userResponse && (
              <div className="event-details-current-status">
                <p>
                  Your current status:{" "}
                  <strong>{userResponse.replace("_", " ")}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Additional Information */}
        {event.needsVolunteers && (
          <div className="event-details-section volunteer-info">
            <h3>🙋‍♂️ Volunteers Needed</h3>
            <p>
              This event is looking for volunteers to help make it a success!
            </p>
            {event.maxVolunteers && (
              <p>Maximum volunteers needed: {event.maxVolunteers}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
