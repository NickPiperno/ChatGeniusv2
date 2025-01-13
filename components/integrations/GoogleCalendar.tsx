'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGoogleLogin } from '@react-oauth/google'
import { Calendar as CalendarIcon, Plus, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchApi } from '@/lib/api-client'

interface CalendarEvent {
  id: string
  summary: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
}

export function GoogleCalendarIntegration() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (response) => {
      setIsAuthenticated(true)
      localStorage.setItem('google_access_token', response.access_token)
      await fetchEvents(response.access_token)
    },
    onError: (error) => {
      console.error('Google Login Error:', error)
    }
  })

  const fetchEvents = async (accessToken: string) => {
    try {
      const response = await fetchApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch events')

      const data = await response.json()
      setEvents(data.items)
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    }
  }

  const createEvent = async () => {
    const accessToken = localStorage.getItem('google_access_token')
    if (!accessToken) return

    try {
      const event = {
        summary: 'Team Meeting',
        description: 'ChatGenius team sync',
        start: {
          dateTime: new Date().toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }

      const response = await fetchApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) throw new Error('Failed to create event')

      const newEvent = await response.json()
      setEvents([...events, newEvent])
    } catch (error) {
      console.error('Error creating calendar event:', error)
    }
  }

  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            View and manage your Google Calendar events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              Google Calendar integration requires configuration. Please add your Google OAuth client ID to the environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          View and manage your Google Calendar events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAuthenticated ? (
          <Button onClick={() => login()}>
            Connect Google Calendar
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              <Button onClick={createEvent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
            <div className="space-y-2">
              {events
                .filter(event => {
                  const eventDate = new Date(event.start.dateTime)
                  return selectedDate && 
                    eventDate.getDate() === selectedDate.getDate() &&
                    eventDate.getMonth() === selectedDate.getMonth() &&
                    eventDate.getFullYear() === selectedDate.getFullYear()
                })
                .map(event => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <h4 className="font-medium">{event.summary}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(event.start.dateTime).toLocaleTimeString()} - 
                        {new Date(event.end.dateTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 