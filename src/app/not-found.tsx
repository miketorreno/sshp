import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Number */}
        <div className="space-y-4">
          <h1 className="text-8xl md:text-9xl font-bold text-slate-200 dark:text-slate-700 select-none">
            404
          </h1>
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Page Not Found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mx-auto">
              Sorry, we couldn&rsquo;t find the page you&rsquo;re looking for.
              It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>
        </div>

        {/* Action Card */}
        <Card className="mx-auto max-w-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full bg-transparent"
                size="lg"
              >
                <Link href="javascript:history.back()">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Link>
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Link>
              </Button>

              <Button asChild variant="ghost" size="sm">
                <Link href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
          <p>
            If you believe this is an error, please contact our support team.
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs">
            <span>Error Code: 404</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Page Not Found</span>
          </div>
        </div>
      </div>
    </div>
  );
}
