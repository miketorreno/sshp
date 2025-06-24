import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, UserPlus, UserMinus, Activity } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PatientReportsPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold my-2">Patient Reports</h1>
        <div className="flex items-center gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Patients</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+89</div>
            <p className="text-xs text-muted-foreground">
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Discharged Patients
            </CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">-8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Patients
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">892</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Age Groups</span>
                <span className="text-sm font-medium">Distribution</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">0-18</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-1/4 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">25%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">19-40</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-1/2 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">50%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">41-60</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-1/3 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">33%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">60+</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-1/5 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">20%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Status</span>
                <span className="text-sm font-medium">Count</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Outpatients</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-3/4 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">750</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Admitted</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-1/4 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">142</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">In Recovery</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 w-1/3 rounded-full bg-primary"></div>
                    </div>
                    <span className="text-sm">342</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientReportsPage;
