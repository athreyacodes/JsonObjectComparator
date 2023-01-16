import { Component, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import {Clipboard} from '@angular/cdk/clipboard';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Compare JSON Files';
  FirstFile: any = null;
  SecondFile: any = null;
  FirstFileObject: any = null;
  SecondFileObject: any = null;

  ComputeMissingKeys: boolean = true;
  ComputeDiffInValues: boolean = true;

  MissingKeysA: any[] = [];
  MissingKeysB: any[] = [];

  ValueDifferences: any[] = [];

  get FirstFileName() {
    return this.FirstFile?.name ?? 'First File';
  }

  get SecondFileName() {
    return this.SecondFile?.name ?? 'Second File';
  }

  @ViewChild('stepper') public stepper: MatStepper;

  firstStepFormGroup = this.fb.group({
    FirstFile: [null, Validators.required],
  });
  secondStepFormGroup = this.fb.group({
    SecondFile: [null, Validators.required],
  });
  thirdStepFormGroup = this.fb.group({
    missing: [true, Validators.required],
    valueDiff: [false, Validators.required],
  });
  fourthStepFormGroup = this.fb.group({
    missing: [[], Validators.required],
    valueDiff: [[], Validators.required],
  });

  constructor(private fb: FormBuilder, private clipboard: Clipboard, private snack: MatSnackBar) {}

  // Input Files
  FirstFileSelected(event: any) {
    this.FirstFileObject = null;
    this.FirstFile = event?.target?.files[0] ?? null;
    this.firstStepFormGroup.get("FirstFile")?.setValue(event?.target?.files[0] ?? null);
    (this.stepper as any).next();
    this.ReadJsonFile(this.FirstFile, (event: any) => {
      this.FirstFileObject = JSON.parse(event?.target?.result || "");
    });
  }
  SecondFileSelected(event: any) {
    this.SecondFileObject = null;
    this.SecondFile = event?.target?.files[0] ?? null;
    this.secondStepFormGroup.get("SecondFile")?.setValue(event?.target?.files[0] ?? null);
    (this.stepper as any).next();
    this.ReadJsonFile(this.SecondFile, (event: any) => {
      this.SecondFileObject = JSON.parse(event?.target?.result || "");
    });
  }
  ReadJsonFile(file: any, callback: any) {
    const reader = new FileReader();
    reader.onload = callback;
    reader.readAsText(file);
  }

  // Output
  Compare() {
    if (!this.FirstFileObject || !this.SecondFileObject) {
      return;
    }
    this.MissingKeysA = [];
    this.MissingKeysB = [];
    this.ValueDifferences = [];

    if (this.ComputeMissingKeys) {
      this.CheckMissingKeys(this.FirstFileObject, this.SecondFileObject, "");
    }

    if (this.ComputeDiffInValues) {
      this.CheckValueDifferences(this.FirstFileObject, this.SecondFileObject, "");
    }

    this.stepper.next();
  }
  Reset() {
    this.stepper.reset();
    this.FirstFileObject = null;
    this.SecondFileObject = null;
    this.firstStepFormGroup.get("FirstFile")?.setValue(null);
    this.secondStepFormGroup.get("SecondFile")?.setValue(null);
    this.MissingKeysA = [];
    this.MissingKeysB = [];
    this.ValueDifferences = [];
  }


  // Difference In Values


  // Missing Keys
  CheckMissingKeys(a: any, b: any, prefix: string) {
    const keysA = Object.keys(a) || [];
    const keysB = Object.keys(b) || [];
    const missingKeysA = keysB.filter(keyB => !a[keyB]);
    const missingKeysB = keysA.filter(keyA => !b[keyA]);
    missingKeysA.forEach(k => {
      const missing = prefix ? (prefix + "." + k) : k;
      if (!this.MissingKeysA.includes(missing)) {

        this.MissingKeysA.push(missing);
      }
    });
    missingKeysB.forEach(k => {
      const missing = prefix ? (prefix + "." + k) : k;
      if (!this.MissingKeysB.includes(missing)) {
        this.MissingKeysB.push(missing);
      }
    });
    keysA.forEach(keyA => {
      if (this.IsObject(a[keyA]) && this.IsObject(b[keyA])) {
        this.CheckMissingKeys(a[keyA], b[keyA], prefix ? (prefix + "." + keyA) : keyA);
      }
    });
    keysB.forEach(keyB => {
      if (this.IsObject(a[keyB]) && this.IsObject(b[keyB])) {
        this.CheckMissingKeys(a[keyB], b[keyB], prefix ? (prefix + "." + keyB) : keyB);
      }
    });
  }

  IsObject(obj: any) {
    return obj && Object.keys(obj)?.length && (typeof obj === 'object');
  }

  IsString(str: any) {
    return str && (typeof str === 'string');
  }

  CheckValueDifferences(a: any, b: any, prefix: string) {
    const keysA = Object.keys(a) || [];
    const keysB = Object.keys(b) || [];
    keysA.forEach(keyA => {
      const fullPath = prefix ? (prefix + "." + keyA) : keyA;
      if (
        a[keyA] && b[keyA] && (a[keyA] !== b[keyA]) &&
        !this.ValueDifferences.find(v => v.fullPath === fullPath) &&
        (this.IsString(a[keyA]) || this.IsString(b[keyA]))
      ) {
        this.ValueDifferences.push({
          key: keyA,
          fullPath: fullPath,
          value1: a[keyA],
          value2: b[keyA]
        });
      }
    });
    keysB.forEach(keyB => {
      const fullPath = prefix ? (prefix + "." + keyB) : keyB;
      if (
        a[keyB] && b[keyB] && (a[keyB] !== b[keyB]) &&
        !this.ValueDifferences.find(v => v.fullPath === fullPath) &&
        (this.IsString(a[keyB]) || this.IsString(b[keyB]))
      ) {
        this.ValueDifferences.push({
          key: keyB,
          fullPath: fullPath,
          value1: a[keyB],
          value2: b[keyB]
        });
      }
    });

    keysA.forEach(keyA => {
      if (this.IsObject(a[keyA]) && this.IsObject(b[keyA])) {
        this.CheckValueDifferences(a[keyA], b[keyA], prefix ? (prefix + "." + keyA) : keyA);
      }
    });
    keysB.forEach(keyB => {
      if (this.IsObject(a[keyB]) && this.IsObject(b[keyB])) {
        this.CheckValueDifferences(a[keyB], b[keyB], prefix ? (prefix + "." + keyB) : keyB);
      }
    });
  }

  goToGithubPage() {
    window.open("https://github.com/athreyacodes/JsonObjectComparator","_blank");
  }

  copy(v: any) {
    this.clipboard.copy(v);
    this.snack.open(v);
  }
}
